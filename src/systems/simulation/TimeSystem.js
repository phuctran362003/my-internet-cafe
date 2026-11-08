import { isSimulationPaused } from '../../state/createInitialState.js';

export function getPeriod(minute, periods) {
  return periods.find((period) => minute >= period.start && minute < period.end) ?? periods[periods.length - 1];
}

export function createTimeSystem({ state, data }) {
  const config = data.simulation;
  return {
    advance(deltaMs, speed = state.meta.speed) {
      if (isSimulationPaused(state) || state.meta.pendingDayEnd) return 0;
      const rate = config.gameMinutesPerRealSecond * speed;
      let minutes = (deltaMs / 1000) * rate;
      const room = config.dayEndMinute - state.meta.currentTime;
      if (minutes >= room) {
        const applied = Math.max(0, room);
        state.meta.currentTime = config.dayEndMinute;
        state.meta.pendingDayEnd = true;
        return applied;
      }
      state.meta.currentTime += minutes;
      return minutes;
    }
  };
}
