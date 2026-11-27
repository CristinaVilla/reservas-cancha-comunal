use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Slot {
    pub enabled: bool,
    pub owner: Option<Address>,
}
