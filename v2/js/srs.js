/** A small SM-2 style scheduler. Ease starts at 2.5. Intervals are in days. */

export function blankSchedule(now = Date.now()) {
  return {
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    due: now
  };
}

export function reviewCard(card, rating, now = Date.now()) {
  const ease0 = Number(card.ease) > 1 ? Number(card.ease) : 2.5;
  let ease = ease0;
  let reps = Number(card.reps) || 0;
  let interval = Number(card.intervalDays) || 0;
  let lapses = Number(card.lapses) || 0;
  const day = 86400000;

  if (rating === "again") {
    lapses += 1;
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
    return { ease, intervalDays: interval, reps, lapses, due: now + 10 * 60 * 1000 };
  }

  if (rating === "hard") {
    ease = Math.max(1.3, ease - 0.15);
    interval = Math.max(1, Math.round((interval || 1) * 1.2));
    reps += 1;
    return { ease, intervalDays: interval, reps, lapses, due: now + interval * day };
  }

  if (rating === "easy") {
    ease = Math.min(3.2, ease + 0.15);
    if (reps === 0) interval = 2;
    else if (reps === 1) interval = 4;
    else interval = Math.max(1, Math.round(interval * ease * 1.3));
    reps += 1;
    return { ease, intervalDays: interval, reps, lapses, due: now + interval * day };
  }

  // good
  if (reps === 0) interval = 1;
  else if (reps === 1) interval = 3;
  else interval = Math.max(1, Math.round((interval || 1) * ease));
  reps += 1;
  return { ease, intervalDays: interval, reps, lapses, due: now + interval * day };
}

export function isDue(card, now = Date.now()) {
  return !card.deleted && Number(card.due || 0) <= now;
}

export function cardKey(itemId, front) {
  return `${itemId}|${String(front || "").trim()}`;
}
