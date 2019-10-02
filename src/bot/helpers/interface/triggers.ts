export function triggerMessage(message: onEventMessage) {
  console.log({message})
}

export function triggerSub(opts: onEventSub) {
  console.log({opts})

}

export function triggerTip(opts: onEventTip) {
  console.log({opts})
}

function trigger(opts: onEventMessage | onEventSub | onEventBit | onEventTip | onEventFollow) {
  for (const systems of [
    ...global.systems, ...global.games, ...global.overlays, ...global.widgets, ...global.integrations
  ])
  for (let [type, systems] of Object.entries({
    systems: global.systems,
    games: global.games,
    overlays: global.overlays,
    widgets: global.widgets,
    integrations: global.integrations
  })) {
    for (let [name, system] of Object.entries(systems)) {
      if (name.startsWith('_') || typeof system.on === 'undefined') continue
      if (Array.isArray(system.on.message)) {
        for (const fnc of system.on.message) {
          system[fnc]({
            sender: message.tags,
            message: message.message,
            timestamp: _.now()
          })
        }
      }
    }
  }
}