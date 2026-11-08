import simulation from './simulation.json';
import economy from './economy/economy.json';
import tiers from './computers/tiers.json';
import customers from './customers/archetypes.json';
import map from './maps/cafe.json';
import familyMembers from './family/family-members.json';
import survival from './family/survival-config.json';
import familyEvents from './family/family-events.json';
import incidents from './events/incidents.json';
import randomEvents from './events/random-events.json';
import staff from './employees/staff.json';
import items from './items/items.json';
import facilities from './facilities/facilities.json';
import guide from './guide/lessons.json';
import furniture from './furniture/catalog.json';

export function loadGameData() {
  return {
    simulation,
    economy,
    tiers,
    customers,
    map,
    familyMembers,
    survival,
    familyEvents,
    incidents,
    randomEvents,
    staff,
    items,
    facilities,
    guide,
    furniture
  };
}
