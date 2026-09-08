export interface HomeMediaSlot {
  key: string;
  label: string;
  chapterNumber: string;
  chapter: string;
  placement: string;
  guidance: string;
  aspect: string;
  multiple: boolean;
  recommended: string;
  maxUsed: number | null;
}

export const HOME_MEDIA_SLOTS: HomeMediaSlot[] = [
  {
    key: "bench",
    label: "Workbench Reference",
    chapterNumber: "02",
    chapter: "Chapter 02 — The Craft",
    placement:
      "The photograph pinned to the drawing board on the jeweller's workbench — the piece being worked from.",
    guidance:
      "One photo. If several are active the first in order is used.",
    aspect: "Portrait 4:5. Shown small and at an angle, so fine detail is lost.",
    multiple: false,
    recommended: "1 photo",
    maxUsed: 1
  },
  {
    key: "wall",
    label: "Gallery Wall Frames",
    chapterNumber: "03",
    chapter: "Chapter 03 — The Collection",
    placement:
      "The framed pictures hanging in the six wall niches of The Collection room, passed on both sides as the visitor scrolls through chapter 03.",
    guidance:
      "Six photos fill every niche exactly. Fewer is fine — the walls repeat the list from the start to fill the remaining frames.",
    aspect: "Portrait 4:5 reads best. Landscape photos letterbox inside the frame.",
    multiple: true,
    recommended: "6 photos",
    maxUsed: null
  },
  {
    key: "plinth",
    label: "Collection Lookbook",
    chapterNumber: "03",
    chapter: "Chapter 03 — The Collection",
    placement:
      "The open jewellery lookbook on the centre counter in The Collection room. Visitors browse two photographs per spread using the page controls.",
    guidance:
      "All active photos are shown in your chosen order. Titles appear beneath each image; alt text describes the pieces for screen readers. An odd final photo gets its own closing spread.",
    aspect: "Any aspect. The complete photo fits inside the page without cropping or stretching.",
    multiple: true,
    recommended: "6 to 10 photos",
    maxUsed: null
  },
  {
    key: "moments",
    label: "Moment Panels",
    chapterNumber: "04",
    chapter: "Chapter 04 — Made for Moments",
    placement:
      "The two framed photographs standing either side of the film, angled in off the aisle in Made for Moments.",
    guidance:
      "Exactly two are shown, left then right. The film between them is fixed and cannot be changed here.",
    aspect: "Portrait 4:5. Both are seen from an angle, so keep the subject central.",
    multiple: true,
    recommended: "2 photos",
    maxUsed: 2
  },
  {
    key: "finale",
    label: "Closing Panels",
    chapterNumber: "05",
    chapter: "Chapter 05 — Yours Forever",
    placement:
      "The pair of large photographs on the tall gold panels either side of the closing scene, the last images of the journey.",
    guidance:
      "Exactly two are shown, left then right. Extra active photos are ignored, so this is a convenient place to park alternatives.",
    aspect: "Portrait 4:5. These are the largest photos in the journey — use the sharpest files.",
    multiple: true,
    recommended: "2 photos",
    maxUsed: 2
  }
];

export const HOME_MEDIA_SLOT_KEYS = HOME_MEDIA_SLOTS.map((slot) => slot.key);
