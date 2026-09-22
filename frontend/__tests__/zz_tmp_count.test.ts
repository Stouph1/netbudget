import { buildChildBirthdayCards } from "../src/constants/ageFacts";
it("compte", () => {
  const i18n = { t: (k: string) => k, tp: (k: string) => k };
  const out: Record<number, number> = {};
  for (const age of [1, 3, 8, 13, 17, 22]) out[age] = buildChildBirthdayCards(age, "N", { country: "FR", family: "couple_with_kids" }, i18n).length;
  console.log(JSON.stringify(out));
});
