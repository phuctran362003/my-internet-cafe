import { tierById } from './PricingSystem.js';

export function applyBusinessExpenses(ctx) {
  const { economy, state, data } = ctx;
  const config = data.economy;
  economy.payObligation(config.rent, 'rent', 'Tiền thuê mặt bằng');
  economy.payObligation(config.internet, 'internet', 'Tiền internet');

  let kwh = 0;
  for (const pc of state.cafe.computers) {
    const tier = tierById(data, pc.tier);
    kwh += (pc.dailyMinutes / 60) * ((tier?.watts ?? 0) / 1000);
  }
  const powerCost = Math.round(kwh * config.pricePerKwh);
  if (powerCost > 0) economy.payObligation(powerCost, 'electricity', 'Tiền điện');

  for (const employee of state.cafe.employees) {
    economy.payObligation(employee.salary, 'wages', `Lương ${employee.name}`);
  }

  if (state.economy.debt > 0) {
    const interest = Math.round(state.economy.debt * config.debtInterest);
    if (interest > 0) economy.addDebt(interest, 'Lãi vay');
  }
}
