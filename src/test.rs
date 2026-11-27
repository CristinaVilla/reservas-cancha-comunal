use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events as _, Ledger as _, MockAuth, MockAuthInvoke},
    IntoVal,
};

const NOW: u64 = 3_600;
const START: u64 = 7_200;

#[test]
fn reserves_and_reads_a_slot() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    client.mock_all_auths().open_slot(&START);
    let alice = Address::generate(&env);

    assert_eq!(client.get_reservation(&START), None);
    client.mock_all_auths().reserve(&alice, &START);
    assert_eq!(client.get_reservation(&START), Some(alice));
}

#[test]
fn rejects_double_booking_and_accepts_a_different_hour() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    client.mock_all_auths().open_slot(&START);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mock_all_auths().reserve(&alice, &START);
    assert_eq!(
        client.mock_all_auths().try_reserve(&bob, &START),
        Err(Ok(Error::SlotTaken))
    );
    let next_start = START + SECONDS_PER_HOUR;
    client.mock_all_auths().open_slot(&next_start);
    client.mock_all_auths().reserve(&bob, &next_start);
    assert_eq!(client.get_reservation(&START), Some(alice));
}

#[test]
fn only_owner_can_cancel_and_slot_can_be_reserved_again() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    client.mock_all_auths().open_slot(&START);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mock_all_auths().reserve(&alice, &START);
    assert_eq!(
        client.mock_all_auths().try_cancel(&bob, &START),
        Err(Ok(Error::NotOwner))
    );
    assert_eq!(client.get_reservation(&START), Some(alice.clone()));

    client.mock_all_auths().cancel(&alice, &START);
    assert_eq!(client.get_reservation(&START), None);
    client.mock_all_auths().reserve(&bob, &START);
    assert_eq!(client.get_reservation(&START), Some(bob));
}

#[test]
fn requires_authorization_to_reserve_or_cancel() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    client.mock_all_auths().open_slot(&START);
    let alice = Address::generate(&env);

    assert!(client.try_reserve(&alice, &START).is_err());
    assert_eq!(client.get_reservation(&START), None);
    client.mock_all_auths().reserve(&alice, &START);
    assert!(client.try_cancel(&alice, &START).is_err());
    assert_eq!(client.get_reservation(&START), Some(alice));
}

#[test]
fn rejects_non_hourly_and_past_starts() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    let alice = Address::generate(&env);

    for start in [0, NOW, START + 1] {
        assert_eq!(client.try_open_slot(&start), Err(Ok(Error::InvalidStart)));
        assert_eq!(
            client.try_reserve(&alice, &start),
            Err(Ok(Error::InvalidStart))
        );
    }
}

#[test]
fn rejects_canceling_missing_or_started_reservations() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    client.mock_all_auths().open_slot(&START);
    let alice = Address::generate(&env);

    assert_eq!(
        client.try_cancel(&alice, &START),
        Err(Ok(Error::ReservationNotFound))
    );
    client.mock_all_auths().reserve(&alice, &START);
    env.ledger().with_mut(|ledger| {
        ledger.timestamp = START;
        ledger.sequence_number += 720;
    });
    assert_eq!(
        client.mock_all_auths().try_cancel(&alice, &START),
        Err(Ok(Error::SlotAlreadyStarted))
    );
}

#[test]
fn only_the_association_can_open_a_slot() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let outsider = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    let invocation = MockAuthInvoke {
        contract: &contract_id,
        fn_name: "open_slot",
        args: (START,).into_val(&env),
        sub_invokes: &[],
    };

    assert!(!client.is_open(&START));
    assert!(client
        .mock_auths(&[MockAuth {
            address: &outsider,
            invoke: &invocation
        }])
        .try_open_slot(&START)
        .is_err());
    assert!(!client.is_open(&START));

    client
        .mock_auths(&[MockAuth {
            address: &admin,
            invoke: &invocation,
        }])
        .open_slot(&START);
    assert!(client.is_open(&START));
}

#[test]
fn rejects_reserving_a_slot_that_was_not_opened() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    let alice = Address::generate(&env);

    assert_eq!(
        client.mock_all_auths().try_reserve(&alice, &START),
        Err(Ok(Error::SlotNotOpen))
    );
    assert_eq!(client.get_reservation(&START), None);
}

#[test]
fn reports_admin_and_combined_slot_state() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    let alice = Address::generate(&env);

    assert_eq!(client.get_admin(), admin);
    assert_eq!(
        client.get_slot(&START),
        Slot {
            enabled: false,
            owner: None
        }
    );
    client.mock_all_auths().open_slot(&START);
    assert_eq!(
        client.get_slot(&START),
        Slot {
            enabled: true,
            owner: None
        }
    );
    client.mock_all_auths().reserve(&alice, &START);
    assert_eq!(
        client.get_slot(&START),
        Slot {
            enabled: true,
            owner: Some(alice)
        }
    );
}

#[test]
fn emits_events_only_after_successful_changes() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);
    let admin = Address::generate(&env);
    let contract_id = env.register(CourtReservations, (&admin,));
    let client = CourtReservationsClient::new(&env, &contract_id);
    let alice = Address::generate(&env);

    client.mock_all_auths().open_slot(&START);
    assert_eq!(env.events().all().events().len(), 1);
    client.mock_all_auths().open_slot(&START);
    assert!(env.events().all().events().is_empty());

    client.mock_all_auths().reserve(&alice, &START);
    assert_eq!(env.events().all().events().len(), 1);
    assert_eq!(
        client.mock_all_auths().try_reserve(&alice, &START),
        Err(Ok(Error::SlotTaken))
    );
    assert!(env.events().all().events().is_empty());

    client.mock_all_auths().cancel(&alice, &START);
    assert_eq!(env.events().all().events().len(), 1);
}
