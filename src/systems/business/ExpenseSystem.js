import { readPressure } from './FacilitySystem.js';
import { tierById } from './PricingSystem.js';

export function applyBusinessExpenses(ctx) {
  const { economy, state, data } = ctx;
  const config = data.economy;
  const pressure = readPressure(ctx);
  economy.payObligation(config.rent, 'rent', 'Tiền thuê mặt bằng');
  economy.payObligation(
    Math.round(config.internet * (pressure.network.billMultiplier ?? 1)),
    'internet',
    `Tiền internet (${pressure.network.name})`
  );

  let kwh = 0;
  for (const pc of state.cafe.computers) {
    const tier = tierById(data, pc.tier);
    kwh += (pc.dailyMinutes / 60) * ((tier?.watts ?? 0) / 1000);
  }
  kwh += pressure.cooling.dailyKwh ?? 0;
  const powerCost = Math.round(kwh * config.pricePerKwh);
  if (powerCost > 0) {
    economy.payObligation(
      powerCost,
      'electricity',
      `Tiền điện (${kwh.toFixed(1)} kWh × ${config.pricePerKwh}đ)`
    );
  }

  for (const employee of state.cafe.employees) {
    const salary = employee.salary
      ?? employee.wagePerHour
      ?? config.staffDailyWage
      ?? config.wagePerHour;
    if (!salary) continue;
    economy.payObligation(salary, 'wages', `Lương ${employee.name}`);
  }

  if (state.economy.debt > 0) {
    const interest = Math.round(state.economy.debt * config.debtInterest);
    if (interest > 0) {
      economy.addDebt(interest, `Lãi vay ${Math.round(config.debtInterest * 100)}%/ngày`);
    }
  }
}
