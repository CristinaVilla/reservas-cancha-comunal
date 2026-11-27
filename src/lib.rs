#![no_std]

mod errors;
mod events;
mod storage;
mod types;

pub use errors::Error;
pub use types::Slot;

use events::{SlotCancelled, SlotOpened, SlotReserved};
use soroban_sdk::{contract, contractimpl, Address, Env};
use storage::DataKey;

const SECONDS_PER_HOUR: u64 = 3_600;

#[contract]
pub struct CourtReservations;

#[contractimpl]
impl CourtReservations {
    pub fn __constructor(env: Env, admin: Address) {
        storage::set_admin(&env, &admin);
    }

    pub fn get_admin(env: Env) -> Address {
        storage::admin(&env)
    }

    pub fn get_slot(env: Env, start: u64) -> Slot {
        Slot {
            enabled: Self::is_open(env.clone(), start),
            owner: Self::get_reservation(env, start),
        }
    }

    pub fn open_slot(env: Env, start: u64) -> Result<(), Error> {
        validate_start(&env, start)?;
        let admin = Self::get_admin(env.clone());
        admin.require_auth();

        let key = DataKey::OpenSlot(start);
        let storage = env.storage().persistent();
        if !storage.has(&key) {
            storage.set(&key, &true);
            SlotOpened { start, admin }.publish(&env);
        }
        storage::renew(&env, &key);
        storage::renew_instance(&env);
        Ok(())
    }

    pub fn is_open(env: Env, start: u64) -> bool {
        start > env.ledger().timestamp()
            && env.storage().persistent().has(&DataKey::OpenSlot(start))
    }

    pub fn reserve(env: Env, user: Address, start: u64) -> Result<(), Error> {
        validate_start(&env, start)?;

        user.require_auth();
        let key = DataKey::Reservation(start);
        let storage = env.storage().persistent();

        if !storage.has(&DataKey::OpenSlot(start)) {
            return Err(Error::SlotNotOpen);
        }

        if storage.has(&key) {
            return Err(Error::SlotTaken);
        }

        storage.set(&key, &user);
        storage::renew(&env, &key);
        storage::renew(&env, &DataKey::OpenSlot(start));
        storage::renew_instance(&env);
        SlotReserved { start, user }.publish(&env);
        Ok(())
    }

    pub fn cancel(env: Env, user: Address, start: u64) -> Result<(), Error> {
        let key = DataKey::Reservation(start);
        let storage = env.storage().persistent();
        let owner: Address = storage.get(&key).ok_or(Error::ReservationNotFound)?;

        if user != owner {
            return Err(Error::NotOwner);
        }
        if start <= env.ledger().timestamp() {
            return Err(Error::SlotAlreadyStarted);
        }

        user.require_auth();
        storage.remove(&key);
        storage::renew_instance(&env);
        SlotCancelled { start, user }.publish(&env);
        Ok(())
    }

    pub fn get_reservation(env: Env, start: u64) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Reservation(start))
    }
}

fn validate_start(env: &Env, start: u64) -> Result<(), Error> {
    if start % SECONDS_PER_HOUR != 0 || start <= env.ledger().timestamp() {
        return Err(Error::InvalidStart);
    }
    Ok(())
}

#[cfg(test)]
mod test;
