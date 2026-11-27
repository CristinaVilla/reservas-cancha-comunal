use soroban_sdk::contracterror;

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    InvalidStart = 1,
    SlotTaken = 2,
    ReservationNotFound = 3,
    NotOwner = 4,
    SlotAlreadyStarted = 5,
    SlotNotOpen = 6,
}
