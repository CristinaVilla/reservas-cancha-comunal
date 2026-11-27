use soroban_sdk::{contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Reservation(u64),
    Admin,
    OpenSlot(u64),
}

// TTL se mide en ledgers. Estos valores se limitan al máximo de la red.
const RENEW_BELOW: u32 = 17_280;
const EXTEND_TO: u32 = 518_400;

pub(crate) fn renew(env: &Env, key: &DataKey) {
    let target = EXTEND_TO.min(env.storage().max_ttl());
    env.storage()
        .persistent()
        .extend_ttl(key, RENEW_BELOW.min(target), target);
}

pub(crate) fn renew_instance(env: &Env) {
    let target = EXTEND_TO.min(env.storage().max_ttl());
    env.storage()
        .instance()
        .extend_ttl(RENEW_BELOW.min(target), target);
}

pub(crate) fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
    renew_instance(env);
}

pub(crate) fn admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}
