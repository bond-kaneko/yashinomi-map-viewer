import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

// Types for the chamber of the Diet
type Chamber = "representatives" | "councillors" | "all";

interface Politician {
  chamber: Chamber;
  district: string;
  name: string;
  party: string;
  separateLastName: string; // For 選択的夫婦別姓
  sameSexMarriage: string; // For 同性婚
}

// Ensure output directory exists
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

async function scrapeYashinomi(
  chamber: Chamber,
  url: string
): Promise<Politician[]> {
  console.log(`Starting scraping process for ${chamber}...`);

  // Fetch the webpage
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract politician data from the table
  const politicians: Politician[] = [];

  // Get table rows
  const rows = $("table tr").slice(1); // Skip header row

  rows.each((_, row) => {
    const columns = $(row).find("td");

    if (columns.length >= 4) {
      // Remove duplicate text from district (e.g., 北海道1区北海道1区 → 北海道1区)
      const districtText = $(columns[0]).text().trim();
      const district = districtText.substring(0, districtText.length / 2);

      // Separate name and party (e.g., 立憲民主党道下 大樹立憲民主党道下 大樹 → 立憲民主党, 道下 大樹)
      const nameWithPartyText = $(columns[1]).text().trim();
      const nameWithParty = nameWithPartyText.substring(
        0,
        nameWithPartyText.length / 2
      );

      // Separate party and name
      let party = "";
      let name = nameWithParty;

      const parties = [
        "自由民主党",
        "公明党",
        "立憲民主党",
        "日本維新の会",
        "国民民主党",
        "共産党",
        "社会民主党",
        "日本保守党",
        "参政党",
        "れいわ新選組",
        "無所属",
      ];

      for (const p of parties) {
        if (nameWithParty.startsWith(p)) {
          party = p;
          name = nameWithParty.substring(p.length);
          break;
        }
      }

      // Get votes on separate last name and same-sex marriage
      const separateLastNameText = $(columns[2]).text().trim();
      const separateLastName = separateLastNameText.substring(
        0,
        separateLastNameText.length / 2
      );

      const sameSexMarriageText = $(columns[3]).text().trim();
      const sameSexMarriage = sameSexMarriageText.substring(
        0,
        sameSexMarriageText.length / 2
      );

      politicians.push({
        chamber,
        district,
        name,
        party,
        separateLastName,
        sameSexMarriage,
      });
    }
  });

  console.log(
    `Scraping completed: Retrieved data for ${politicians.length} ${chamber}`
  );
  return politicians;
}

function generateStatistics(
  politicians: Politician[],
  chamber: Chamber
): Record<string, any> {
  // Generate statistics
  const stats = {
    chamber,
    total: politicians.length,
    separateLastName: {
      賛成: politicians.filter((r) => r.separateLastName === "賛成").length,
      反対: politicians.filter((r) => r.separateLastName === "反対").length,
      無回答: politicians.filter((r) => r.separateLastName === "無回答").length,
    },
    sameSexMarriage: {
      賛成: politicians.filter((r) => r.sameSexMarriage === "賛成").length,
      反対: politicians.filter((r) => r.sameSexMarriage === "反対").length,
      無回答: politicians.filter((r) => r.sameSexMarriage === "無回答").length,
    },
    byParty: {} as Record<
      string,
      {
        count: number;
        separateLastName: { 賛成: number; 反対: number; 無回答: number };
        sameSexMarriage: { 賛成: number; 反対: number; 無回答: number };
      }
    >,
  };

  // Statistics by party
  const parties = [...new Set(politicians.map((r) => r.party))];

  for (const party of parties) {
    const partyMembers = politicians.filter((r) => r.party === party);

    stats.byParty[party] = {
      count: partyMembers.length,
      separateLastName: {
        賛成: partyMembers.filter((r) => r.separateLastName === "賛成").length,
        反対: partyMembers.filter((r) => r.separateLastName === "反対").length,
        無回答: partyMembers.filter((r) => r.separateLastName === "無回答")
          .length,
      },
      sameSexMarriage: {
        賛成: partyMembers.filter((r) => r.sameSexMarriage === "賛成").length,
        反対: partyMembers.filter((r) => r.sameSexMarriage === "反対").length,
        無回答: partyMembers.filter((r) => r.sameSexMarriage === "無回答")
          .length,
      },
    };
  }

  return stats;
}

async function main(): Promise<void> {
  try {
    // Ensure output directory exists
    const outputDir = path.join("static", "politicians");
    ensureDirectoryExists(outputDir);

    // Scrape House of Representatives (衆議院)
    const representatives = await scrapeYashinomi(
      "representatives",
      "https://yashino.me/house-r"
    );

    // Save results to JSON file
    fs.writeFileSync(
      path.join(outputDir, "representatives.json"),
      JSON.stringify(representatives, null, 2),
      "utf8"
    );
    console.log(
      "Representatives data saved to static/politicians/representatives.json"
    );

    // Generate and save statistics
    const repStats = generateStatistics(representatives, "representatives");
    fs.writeFileSync(
      path.join(outputDir, "representatives_statistics.json"),
      JSON.stringify(repStats, null, 2),
      "utf8"
    );
    console.log(
      "Representatives statistics saved to static/politicians/representatives_statistics.json"
    );

    // Scrape House of Councillors (参議院)
    const councillors = await scrapeYashinomi(
      "councillors",
      "https://yashino.me/house-c"
    );

    // Save results to JSON file
    fs.writeFileSync(
      path.join(outputDir, "councillors.json"),
      JSON.stringify(councillors, null, 2),
      "utf8"
    );
    console.log(
      "Councillors data saved to static/politicians/councillors.json"
    );

    // Generate and save statistics
    const counStats = generateStatistics(councillors, "councillors");
    fs.writeFileSync(
      path.join(outputDir, "councillors_statistics.json"),
      JSON.stringify(counStats, null, 2),
      "utf8"
    );
    console.log(
      "Councillors statistics saved to static/politicians/councillors_statistics.json"
    );

    // Combined data
    const allPoliticians = [...representatives, ...councillors];
    fs.writeFileSync(
      path.join(outputDir, "all_politicians.json"),
      JSON.stringify(allPoliticians, null, 2),
      "utf8"
    );
    console.log(
      "Combined data saved to static/politicians/all_politicians.json"
    );

    // Combined statistics
    const allStats = generateStatistics(allPoliticians, "all");
    fs.writeFileSync(
      path.join(outputDir, "all_statistics.json"),
      JSON.stringify(allStats, null, 2),
      "utf8"
    );
    console.log(
      "Combined statistics saved to static/politicians/all_statistics.json"
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Execute the script
main();
