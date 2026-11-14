import { describe, expect, it } from "vitest";
import { blankToList, blankPack } from "../src/report/pack";
import { blankSpot, blankSuggestions, examplesFor, fitToSpot, liftNear, listItems, splitLead } from "../src/report/samples";

/** Every sentence here is made up for the tests. */

const COPY = "{{They}} copied [[shapes copied without help]] from a model. [[Shapes not yet copied]].";
const COPY_EXAMPLES = [
  "Design copy – She copied a zigzag, a spiral and a star from the model. Her hexagon had rounded corners.",
  "Design copy – He copied a spiral, an arrow, and a hexagon from the card.",
];

describe("where a blank sits", () => {
  it("knows the fixed words around a blank and whether it is a whole sentence", () => {
    expect(blankSpot(COPY, 0, "she")).toEqual({ before: "She copied", after: "from a model", startsSentence: false, endsSentence: false });
    expect(blankSpot(COPY, 1, "she")).toEqual({ before: "", after: "", startsSentence: true, endsSentence: true });
    expect(blankSpot("{{They}} uses a [[grasp]] grasp.", 0, "he")).toMatchObject({ before: "He uses a", after: "grasp", startsSentence: false });
    expect(blankSpot(undefined, 0, "he")).toMatchObject({ startsSentence: true, endsSentence: true });
  });

  it("finds the spot in an example that words the line a little differently", () => {
    const spot = blankSpot(COPY, 0, "she");
    expect(liftNear("She copied a zigzag, a spiral and a star from the model.", spot)).toBe("a zigzag, a spiral and a star");
    expect(liftNear("Her hexagon had rounded corners.", spot)).toBeNull();
    // A whole-sentence blank has no spot to find.
    expect(liftNear("Her hexagon had rounded corners.", blankSpot(COPY, 1, "she"))).toBeNull();
  });
});

describe("lists become pieces", () => {
  it("splits a list into its items and leaves other text alone", () => {
    expect(listItems("a zigzag, a spiral and a star")).toEqual(["a zigzag", "a spiral", "a star"]);
    expect(listItems("a spiral, an arrow, and a hexagon.")).toEqual(["a spiral", "an arrow", "a hexagon"]);
    expect(listItems("extra time and a slant board")).toEqual(["extra time", "a slant board"]);
    expect(listItems("Taste and Smell, and Balance and Motion")).toEqual(["Taste and Smell", "Balance and Motion"]);
    expect(listItems("letters (20/26, with b, d and p turned), numbers 1 to 9, and her name")).toEqual(["letters (20/26, with b, d and p turned)", "numbers 1 to 9", "her name"]);
    expect(listItems("too hard")).toEqual([]);
  });

  it("takes a sentence's opening off its first item", () => {
    expect(splitLead(["She was able to copy a zigzag", "a spiral", "a star"])).toEqual({ lead: "She was able to copy", items: ["a zigzag", "a spiral", "a star"] });
    expect(splitLead(["a zigzag", "a spiral"])).toEqual({ lead: "", items: ["a zigzag", "a spiral"] });
  });
});

describe("what the picker offers", () => {
  it("offers a list's items one by one for a blank in the middle of a sentence", () => {
    const s = blankSuggestions({ template: COPY, blankIndex: 0, label: "shapes copied without help", blockLabel: "Design copy", examples: COPY_EXAMPLES, pronoun: "she" });
    expect(s.fills).toEqual(["a zigzag, a spiral and a star", "a spiral, an arrow, and a hexagon"]);
    expect(s.parts).toEqual(["a zigzag", "a spiral", "a star", "an arrow", "a hexagon"]);
    expect(s.partsLead).toBe("");
    expect(s.spot.startsSentence).toBe(false);
  });

  it("gives a whole-sentence blank the items of a related sentence, led by its opening", () => {
    const s = blankSuggestions({
      template: "[[What the student copied from a model]].",
      blankIndex: 0,
      label: "What the student copied from a model",
      examples: ["He was able to copy a zigzag, a spiral, an arrow, and a hexagon. He held the paper still."],
      pronoun: "he",
    });
    expect(s.partsLead).toBe("He was able to copy");
    expect(s.parts).toEqual(["a zigzag", "a spiral", "an arrow", "a hexagon"]);
  });

  it("reads labelled examples only under the paragraph's own label", () => {
    const section = ["Coloring – She colored a kite with small strokes. Cutting – She cut a wavy line. She turned the paper.", "Notes: none.\nColoring: He colored a boat."];
    expect(examplesFor(section, "Coloring")).toEqual(["Coloring – She colored a kite with small strokes.", "Coloring: He colored a boat."]);
    expect(examplesFor(section, "cutting")).toEqual(["Cutting – She cut a wavy line."]);
    expect(examplesFor(section, "Typing")).toEqual(section);
    expect(examplesFor(section, undefined)).toEqual(section);
    const s = blankSuggestions({ template: "[[How the student colored]].", blankIndex: 0, label: "How the student colored", blockLabel: "Coloring", examples: section, pronoun: "she" });
    expect(s.all).toEqual(["She colored a kite with small strokes.", "She colored a boat."]);
  });
});

describe("fitting a choice into its spot", () => {
  const mid = blankSpot("These needs affect {{their}} ability to [[what is hard]] in class.", 0, "she");
  it("does not write the template's own words twice and starts in lowercase mid-sentence", () => {
    expect(fitToSpot("Her needs affect her ability to finish a page of writing in class.", mid, false)).toBe("finish a page of writing");
    expect(fitToSpot("She loses her place when copying.", mid, false)).toBe("she loses her place when copying");
    expect(fitToSpot("Beery scores were low.", mid, false)).toBe("Beery scores were low");
  });
  it("starts a sentence with a capital and leaves the period to the template", () => {
    const whole = blankSpot("[[Anything]].", 0, "he");
    expect(fitToSpot("a zigzag and a star.", whole, true)).toBe("A zigzag and a star");
    expect(fitToSpot("He sat upright.", whole, false)).toBe("He sat upright.");
  });
});

describe("a blank becomes a dropdown of its own", () => {
  it("adds the list and names it on the blank, keeping other blanks as they are", () => {
    const pack = blankPack("Test");
    const section = pack.sections[0];
    const block = { ...section.blocks[0], id: "p", text: "{{They}} copied [[shapes copied]] and [[how]]." };
    const start = { ...pack, sections: [{ ...section, blocks: [block] }] };
    const made = blankToList(start, section.id, "p", 0, ["a zigzag", "a star", "a zigzag"], true)!;
    expect(made.name).toBe("shapesCopied");
    expect(made.pack.lists.shapesCopied).toEqual({ options: ["a zigzag", "a star"], multi: true });
    expect(made.pack.sections[0].blocks[0]).toMatchObject({ text: "{{They}} copied [[shapes copied::shapesCopied]] and [[how]]." });
    // A blank that already has a list, or is not there, is left alone.
    expect(blankToList(made.pack, section.id, "p", 0, ["x"], false)).toBeNull();
    expect(blankToList(made.pack, section.id, "p", 5, ["x"], false)).toBeNull();
    // A second list from a blank with the same label gets its own name.
    const again = { ...made.pack, sections: [{ ...section, blocks: [{ ...block, id: "q", text: "[[shapes copied]]" }] }] };
    expect(blankToList(again, section.id, "q", 0, ["x"], false)!.name).toBe("shapesCopied2");
  });
});
