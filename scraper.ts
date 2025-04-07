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
  electionYear: number; // Election year
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

  // Find all h2 headings that might contain election year information
  const sections = $("h2");

  if (sections.length === 0) {
    throw new Error(
      `No section headings found in the page. Cannot determine election years.`
    );
  }

  let currentElectionYear: number | null = null;
  let foundValidYear = false;
  const validElectionYears: number[] = [];

  // Process each section and its corresponding table
  sections.each((_, section) => {
    const sectionTitle = $(section).text().trim();

    // Try to extract election year from section title
    // Looking for patterns like "2024年 衆議院議員 当選者リスト" or similar
    const yearMatch = sectionTitle.match(/(\d{4})年/);
    if (yearMatch) {
      const extractedYear = parseInt(yearMatch[1], 10);
      // Accept any reasonable election year (not in the future)
      const currentYear = new Date().getFullYear();
      if (extractedYear > 1945 && extractedYear <= currentYear) {
        currentElectionYear = extractedYear;
        foundValidYear = true;
        if (!validElectionYears.includes(extractedYear)) {
          validElectionYears.push(extractedYear);
        }
        console.log(`Found election year section: ${currentElectionYear}`);
      } else {
        console.log(`Found invalid election year in section: ${extractedYear}`);
        currentElectionYear = null; // Reset to null for invalid years
      }
    }

    // Skip sections where we couldn't determine a valid election year
    if (currentElectionYear === null) {
      console.log(
        `Skipping section "${sectionTitle}" because no valid election year was found`
      );
      return;
    }

    // Find the next table after this heading
    let tableElement = $(section).nextAll("table").first();

    // If no table found directly, try looking within the next container element
    if (tableElement.length === 0) {
      tableElement = $(section).nextUntil("h2").find("table").first();
    }

    if (tableElement.length === 0) {
      console.log(`No table found for section: "${sectionTitle}"`);
      return; // Skip if no table found
    }

    // Get table rows
    const rows = tableElement.find("tr").slice(1); // Skip header row

    if (rows.length === 0) {
      console.log(`No rows found in table for section: "${sectionTitle}"`);
      return; // Skip if no rows found
    }

    const sectionPoliticians: Politician[] = [];

    // At this point we know currentElectionYear is not null
    const electionYear = currentElectionYear;

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

        sectionPoliticians.push({
          chamber,
          district,
          name,
          party,
          separateLastName,
          sameSexMarriage,
          electionYear,
        });
      }
    });

    console.log(
      `Found ${sectionPoliticians.length} politicians in section: "${sectionTitle}" for year ${electionYear}`
    );
    politicians.push(...sectionPoliticians);
  });

  // If we didn't find any data from sections with valid years, try detecting the structure
  if (politicians.length === 0) {
    throw new Error(
      `No politicians found with valid election years. Check the page structure.`
    );
  }

  // Check if we got a reasonable number of politicians
  if (chamber === "representatives" && politicians.length < 400) {
    console.warn(
      `Warning: Small number of representatives found: ${politicians.length} (expected around 465)`
    );
  }

  // For the House of Councillors, we expect around 245 members
  if (chamber === "councillors" && politicians.length < 200) {
    console.warn(
      `Warning: Small number of councillors found: ${politicians.length} (expected around 245)`
    );
  }

  // If we didn't find any valid year in the headings, that's suspicious
  if (!foundValidYear) {
    throw new Error(
      `No valid election year was found in the page headings. Cannot continue without election year data.`
    );
  }

  // For councillors, we might have multiple election years
  if (
    chamber === "councillors" &&
    validElectionYears.length === 1 &&
    politicians.length > 100
  ) {
    console.warn(
      `Warning: Only one election year (${validElectionYears[0]}) detected for councillors. ` +
        `This might be incorrect as councillors are typically elected in different years.`
    );
  }

  console.log(
    `Scraping completed: Retrieved data for ${
      politicians.length
    } ${chamber} across ${
      validElectionYears.length
    } election years: ${validElectionYears.join(", ")}`
  );

  // Log election year distribution
  const yearCounts = {} as Record<number, number>;
  politicians.forEach((p) => {
    yearCounts[p.electionYear] = (yearCounts[p.electionYear] || 0) + 1;
  });

  console.log("Election year distribution:");
  Object.entries(yearCounts).forEach(([year, count]) => {
    console.log(`${year}: ${count} politicians`);
  });

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
    byElectionYear: {} as Record<
      number,
      {
        total: number;
        separateLastName: { 賛成: number; 反対: number; 無回答: number };
        sameSexMarriage: { 賛成: number; 反対: number; 無回答: number };
      }
    >,
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

  // Statistics by election year
  const electionYears = [...new Set(politicians.map((r) => r.electionYear))];

  for (const year of electionYears) {
    const yearMembers = politicians.filter((r) => r.electionYear === year);

    stats.byElectionYear[year] = {
      total: yearMembers.length,
      separateLastName: {
        賛成: yearMembers.filter((r) => r.separateLastName === "賛成").length,
        反対: yearMembers.filter((r) => r.separateLastName === "反対").length,
        無回答: yearMembers.filter((r) => r.separateLastName === "無回答")
          .length,
      },
      sameSexMarriage: {
        賛成: yearMembers.filter((r) => r.sameSexMarriage === "賛成").length,
        反対: yearMembers.filter((r) => r.sameSexMarriage === "反対").length,
        無回答: yearMembers.filter((r) => r.sameSexMarriage === "無回答")
          .length,
      },
    };
  }

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
    console.log("Scraping House of Representatives data...");
    const representatives = await scrapeYashinomi(
      "representatives",
      "https://yashino.me/house-r"
    );

    // Scrape House of Councillors (参議院)
    console.log("Scraping House of Councillors data...");
    const councillors = await scrapeYashinomi(
      "councillors",
      "https://yashino.me/house-c"
    );

    // Combined data for all politicians
    const allPoliticians = [...representatives, ...councillors];

    // Save all politicians to a single file
    fs.writeFileSync(
      path.join(outputDir, "politicians.json"),
      JSON.stringify(allPoliticians, null, 2),
      "utf8"
    );
    console.log(
      `Combined data for ${allPoliticians.length} politicians saved to static/politicians/politicians.json`
    );

    // Generate and save combined statistics
    const stats = generateStatistics(allPoliticians, "all");
    fs.writeFileSync(
      path.join(outputDir, "statistics.json"),
      JSON.stringify(stats, null, 2),
      "utf8"
    );
    console.log("Statistics saved to static/politicians/statistics.json");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Execute the script
main();
