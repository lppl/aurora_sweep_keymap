import puppeteer from "puppeteer";
import { spawnSync } from "child_process";
import { log } from "node:console";

const BRANCH_NAME = `tmp-branch`;
const URL_EDITOR =
  "https://config.qmk.fm/#/splitkb/aurora/sweep/rev1/LAYOUT_split_3x5_2";
const URL_KEYMAP = `https://raw.githubusercontent.com/lppl/aurora_sweep_keymap/refs/heads/${BRANCH_NAME}/keymap.json`;
const COLORS = Object.freeze({
  DCS_MIDNIGHT: "0",
  DCS_MIDNIGHT_TWILIGHT: "1",
  DSA_GALAXY_CLASS: "2",
  DSA_MILKSHAKE: "3",
  SA_BLISS: "4",
  SA_CARBON: "5",
  SA_DANGER_ZONE: "6",
  SA_JUKEBOX: "7",
  SA_MODERN_SELECTRIC: "8",
  SA_NANTUCKET_SELECTRIC: "9",
  SA_OBLIVION_HAGOROMO: "10",
  SA_VILEBLOOM: "11",
  GMK_8008: "12",
  GMK_9009: "13",
  GMK_ALTER: "14",
  GMK_ANALOG_DREAMS: "15",
  GMK_ASCII: "16",
  GMK_BENTO: "17",
  GMK_BINGSU: "18",
  GMK_CAFE: "19",
  GMK_CALM_DEPTHS: "20",
  GMK_CAMPING: "21",
  GMK_DEKU: "22",
  GMK_DOLCH: "23",
  GMK_DRACULA: "24",
  GMK_DUALSHOT: "25",
  GMK_FRO_YO: "26",
  GMK_GRAND_PRIX: "27",
  GMK_HAMMERHEAD_DARK: "28",
  GMK_HAMMERHEAD_LIGHT: "29",
  GMK_HANDARBEIT_PLUS: "30",
  GMK_HAZAKURA: "31",
  GMK_JAMON: "32",
  GMK_MERLIN: "33",
  GMK_METAVERSE: "34",
  GMK_METROPOLIS_BASE: "35",
  GMK_METROPOLIS_MIDNIGHT: "36",
  GMK_MIZU: "37",
  GMK_NAUTILUS: "38",
  GMK_NINES: "39",
  GMK_OLIVETTI: "40",
  GMK_OLIVIA: "41",
  GMK_OLIVIA_PLUS_PLUS_DARK: "42",
  GMK_PHOSPHOROUS: "43",
  GMK_PLUM: "44",
  GMK_SERIKA: "45",
  GMK_SPACE_CADET: "46",
  GMK_STRIKER: "47",
  GMK_TA_ROYAL_ALPHA: "48",
  GMK_TERMINAL: "49",
  GMK_VAPORWAVE: "50",
  GMK_WOB: "51",
  GMK_YURI: "52",
  JTK_SUITED_ASSASSIN: "53",
  KAT_HYPERFUSE: "54",
  KAT_OASIS: "55",
  MT3_DEV_TTY: "56",
  MT3_DEV_TTY_TEAL: "57",
  MT3_DEV_TTY_ORTHO: "58",
  MT3_SUSUWATARI: "59",
  MT3_SUSUWATARI_ORTHO: "60",
  MT3_LOTR_ELVISH: "61",
  MT3_LOTR_ELVISH_RIVENDELL: "62",
  MT3_LOTR_ELVISH_EVENSTAR: "63",
  MT3_LOTR_ELVISH_ORTHO: "64",
  MT3_LOTR_DWARVISH: "65",
  MT3_LOTR_DWARVISH_DURIN: "66",
  MT3_LOTR_DWARVISH_ORTHO: "67",
  MT3_3277: "68",
  MT3_3277_ORTHO: "69",
  MT3_3277_ACCENT_RED: "70",
});
const RECORDING = `debug/recording.webm`;
const WIDTH = 1024;
const HEIGHT = 1024;

async function main() {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
    defaultViewport: {
      width: WIDTH,
      height: HEIGHT,
    },
    headless: false,
  });
  log("Navigate to QMK Editor");
  const page = await browser.newPage();
  await page.goto(URL_EDITOR);

  log(`Start recording to ${RECORDING}`);
  const recorder = await page.screencast({ path: RECORDING });

  log("Open import url popup");
  const btn = await page.$("#import-url");
  await btn?.click();
  await new Promise((resolve) => setTimeout(resolve, 400));

  log(`Read keymap.json: ${URL_KEYMAP}`);
  const field = await page.$("#url-import-field");
  await field?.type(URL_KEYMAP, { delay: 0 });
  const send = await page.$(`.input-url-modal button`);
  send?.click();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  log(`Prepare screenshot area`);
  await page.select("#colorway-select", COLORS.MT3_LOTR_DWARVISH_DURIN);
  const imageArea = await page.waitForSelector("#visual-keymap");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  for (let layer of await page.$$(".layer.non-empty")) {
    const level = await page.evaluate((el) => el.textContent, layer);
    const img = `img/layer_${level}.png`;
    log(` - ${level}. create screenshot ${img}`);
    await layer.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await imageArea?.screenshot({ path: img });
  }

  await recorder.stop();

  page.close();
}

function runOrDie(command: string, ...args: string[]): string {
  log(`runOrDie: ${command} ${args.join(" ")}`);

  const result = spawnSync(command, args, {
    stdio: ["inherit", "pipe", "inherit"],
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.error(`Error executing command: ${command} ${args.join(" ")}`);
    console.error(result.stderr?.toString());
    process.exit(1);
  }

  return result.stdout?.toString().trim() || "";
}
function check(command: string, ...args: string[]): boolean {
  log(`check: ${command} ${args.join(" ")}`);

  const result = spawnSync(command, args, {
    stdio: "ignore",
  });

  return result.status === 0;
}

function prepare() {
  try {
    if (check("git", "--porcelain")) {
      runOrDie("git", "branch", "-f", BRANCH_NAME, "HEAD");
    } else {
      runOrDie(
        "git",
        "stash",
        "push",
        "--include-untracked",
        "--all",
        "-m",
        "WIP update",
      );
      runOrDie("git", "branch", "-f", BRANCH_NAME, "stash@{0}");
      runOrDie("git", "stash", "pop");
    }

    runOrDie("git", "push", "origin", "--force", BRANCH_NAME);
  } catch (error) {
    console.error("Preparation failed:", error);
    process.exit(1);
  }
}

function cleanup() {
  try {
    runOrDie("git", "branch", "-D", BRANCH_NAME);
    runOrDie("git", "push", "origin", "--delete", BRANCH_NAME);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
}

async function safeMain() {
  prepare();
  try {
    await main();
  } finally {
    cleanup();
    process.exit(0);
  }
}

safeMain();
