export function createDemo() {
  const slots = new Map();
  return {
    admin: 'Asociación',
    actors: ['Asociación', 'Equipo Alice', 'Equipo Bob'],
    async getSlot(start) {
      return slots.get(start) ?? { enabled: false, owner: null };
    },
    async act(action, actor, start) {
      const slot = await this.getSlot(start);
      if (start <= Date.now() / 1000) throw new Error('El turno ya empezó.');
      if (action === 'open_slot') {
        if (actor !== this.admin) throw new Error('Solo la asociación puede habilitar turnos.');
        slots.set(start, { ...slot, enabled: true });
      } else if (action === 'reserve') {
        if (!slot.enabled) throw new Error('La asociación todavía no habilitó este turno.');
        if (slot.owner) throw new Error('El turno ya está reservado.');
        slots.set(start, { ...slot, owner: actor });
      } else if (action === 'cancel') {
        if (slot.owner !== actor) throw new Error('Solo quien reservó puede cancelar.');
        slots.set(start, { ...slot, owner: null });
      }
    },
  };
}

export function costaRicaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return [get('year'), get('month'), get('day')].join('-');
}

export function startAt(date, hour) {
  return Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00-06:00`) / 1000;
}
