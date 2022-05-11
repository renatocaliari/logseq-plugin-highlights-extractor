import '@logseq/libs';
import { BlockEntity, SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";

const settingsTemplate = [{
  key: "headerHighlights",
  type: 'string',
  default: "## Highlights",
  title: "Set the title where will be put the highlights",
  description: "It will be the title of the block that is inserted to get all blocks with highlights",
}]
logseq.useSettingsSchema(settingsTemplate)


const findHighlights = (content) => {
  const rxBlockRef = new RegExp(`(?<=\\=\\=)(\\S.*?)(?=\\=\\=)`, `g`);
  return content.match(rxBlockRef);
};

export const extractHighlights = async (
  arr,
  arrHighlight
) => {

  const blk = await logseq.Editor.getBlock(e.uuid);
  arr.push(blk);

  for (let b of arr) {
    const payload = {
      contentHighlighted: findHighlights(b.content),
      id: b.uuid,
    };
    if (payload.contentHighlighted !== null) {
      arrHighlight.push(payload);
      if (!b.properties.id) {
        await logseq.Editor.upsertBlockProperty(b.uuid, "id", b.uuid);
      }
    }
    if (b.children.length > 0) {
      extractHighlights(b.children, arrHighlight);
    } else {
      continue;
    }
  }
  return arrHighlights;
};

export const createSectionHighlights = async (arrBlocks) => {
  let arrHighlights = extractHighlights(arrBlocks);

  if (arrHighlights.length === 0) {
    logseq.App.showMsg(
      "No highlights found. Please ensure that you have highlighted something under the block you called plugin Highlight Extractor.",
      "error"
    );
    return;
  }

  const blockHeaderHighlight = await logseq.Editor.insertBlock(
    arrBlocks[0].uuid,
    `${logseq.settings.headerHighlights}`,
    {
      before:
        arrBlocks[0].content.includes(":: ") &&
          !arrBlocks[0].content.includes("id:: ")
          ? false
          : true,
      sibling: true,
    }
  );

  const arrHighlightsBlocks = [];
  for (let h of arrHighlights) {
    if (h.highlights === null) {
      continue;
    } else if (h.highlights.length === 1) {
      const payload = {
        content: `${h.highlights[0]} [${h.contentHighlighted}](${h.id})`,
      };
      arrHighlightsBlocks.push(payload);
    } else {
      for (let i of h.highlights) {
        const payload = {
          content: `${i} [${h.contentHighlighted}](${h.id})`,
        };
        arrHighlightsBlocks.push(payload);
      }
    }
  }

  await logseq.Editor.insertBatchBlock(
    blockHeaderHighlight.uuid,
    arrHighlightsBlocks,
    {
      before: false,
      sibling: false,
    }
  );

  logseq.Editor.openInRightSidebar(blockHighlight.uuid);

};

const main = async () => {
  logseq.Editor.registerBlockContextMenuItem("Extract Highlights", async (e) => {
    createSectionHighlights(e);
  });

  logseq.Editor.registerSlashCommand('Extract Highlights', async (e) => {
    createSectionHighlights(e)
  })

}

logseq.ready(main).catch(console.error);
