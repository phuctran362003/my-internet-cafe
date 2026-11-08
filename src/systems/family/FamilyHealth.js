export function livingMembers(state) {
  return state.family.members.filter((member) => member.status !== 'deceased' && member.health > 0);
}

export function deriveStatus(member, healthConfig) {
  if (member.health <= 0 || member.status === 'deceased') return 'deceased';
  if (member.sicknessLevel >= healthConfig.verySickLevel) return 'very_sick';
  if (member.sicknessLevel >= 1) return 'sick';
  if (member.cold >= healthConfig.coldThreshold && member.cold >= member.hunger) return 'cold';
  if (member.hunger >= healthConfig.hungerThreshold) return 'hungry';
  return 'healthy';
}

export function progressMember(member, config) {
  if (member.status === 'deceased' || member.health <= 0) {
    member.status = 'deceased';
    member.health = 0;
    return;
  }
  const rules = config.health;
  if (member.hunger > 0) member.health -= rules.healthLossHunger;
  if (member.cold > 0) member.health -= rules.healthLossCold;

  const needsFail = member.hunger >= rules.sickThreshold || member.cold >= rules.sickThreshold;
  const needsMet = member.hunger < rules.hungerThreshold && member.cold < rules.coldThreshold;

  if (needsFail) {
    member.sicknessLevel += 1 + (member.treatmentDelayed ? 1 : 0);
    member.health -= rules.healthLossSick;
  } else if (needsMet && member.sicknessLevel > 0) {
    member.sicknessLevel = Math.max(0, member.sicknessLevel - 1);
    member.health += rules.recoveryPerDay;
    member.treatmentDelayed = false;
  } else if (member.sicknessLevel === 0) {
    member.health += rules.recoveryPerDay;
  }

  member.health = Math.max(0, Math.min(100, member.health));
  if (member.sicknessLevel >= rules.verySickLevel) member.daysVerySick += 1;
  else member.daysVerySick = 0;

  if (member.health <= 0 || (member.sicknessLevel >= rules.verySickLevel && member.daysVerySick >= rules.daysVerySickUntilDeath)) {
    member.health = 0;
    member.sicknessLevel = Math.max(member.sicknessLevel, rules.verySickLevel);
    member.status = 'deceased';
    return;
  }
  member.status = deriveStatus(member, rules);
}

export function treatMember(member, config) {
  if (!member || member.status === 'deceased' || member.health <= 0) return false;
  const rules = config.health;
  member.health = Math.min(100, member.health + rules.medicineRecovery);
  member.sicknessLevel = Math.max(0, member.sicknessLevel - rules.medicineSicknessReduction);
  member.daysVerySick = 0;
  member.treatmentDelayed = false;
  member.status = deriveStatus(member, rules);
  return true;
}

export function snapshotMembers(state) {
  return state.family.members.map((member) => ({
    id: member.id,
    status: member.status,
    hunger: member.hunger,
    cold: member.cold,
    health: member.health
  }));
}
