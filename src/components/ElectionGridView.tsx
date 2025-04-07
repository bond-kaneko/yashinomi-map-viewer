import { useState } from "react";
import "./ElectionGridView.css";

// 政治家データの型定義
interface Politician {
  chamber: "representatives" | "councillors" | "all";
  district: string;
  name: string;
  party: string;
  separateLastName: string;
  sameSexMarriage: string;
  electionYear: number;
}

interface ElectionGridViewProps {
  politicians: Politician[];
}

// 党ごとの色を定義
const partyColors: Record<string, string> = {
  自由民主党: "#ff0000", // 赤
  立憲民主党: "#0000ff", // 青
  公明党: "#ffcc00", // 黄色
  日本維新の会: "#ff6600", // オレンジ
  国民民主党: "#33cc33", // 緑
  日本共産党: "#660000", // 暗い赤
  れいわ新選組: "#cc00cc", // 紫
  社民党: "#996633", // 茶色
  参政党: "#663399", // 紫
  無所属: "#999999", // グレー
};

// 選挙区名から都道府県名を抽出する関数
const extractPrefecture = (districtName: string): string => {
  // 特別なケース
  if (districtName.includes("選挙区")) {
    // "東京選挙区"、"北海道選挙区"などの場合
    return districtName.replace("選挙区", "");
  }

  // 一般的なケース: "東京1区"、"神奈川4区"など
  const prefectures = [
    "北海道",
    "青森",
    "岩手",
    "宮城",
    "秋田",
    "山形",
    "福島",
    "茨城",
    "栃木",
    "群馬",
    "埼玉",
    "千葉",
    "東京",
    "神奈川",
    "新潟",
    "富山",
    "石川",
    "福井",
    "山梨",
    "長野",
    "岐阜",
    "静岡",
    "愛知",
    "三重",
    "滋賀",
    "京都",
    "大阪",
    "兵庫",
    "奈良",
    "和歌山",
    "鳥取",
    "島根",
    "岡山",
    "広島",
    "山口",
    "徳島",
    "香川",
    "愛媛",
    "高知",
    "福岡",
    "佐賀",
    "長崎",
    "熊本",
    "大分",
    "宮崎",
    "鹿児島",
    "沖縄",
  ];

  for (const prefecture of prefectures) {
    if (districtName.startsWith(prefecture)) {
      return prefecture;
    }
  }

  return districtName; // 抽出できない場合は元の文字列を返す
};

// 日本の地域ごとの都道府県を配置するための定義
const prefectureLayout = [
  // 北海道・東北地方
  { prefecture: "北海道", x: 10, y: 1, span: 2 }, // 北海道は大きく

  // 東北地方
  { prefecture: "青森", x: 10, y: 2 },
  { prefecture: "秋田", x: 9, y: 3 },
  { prefecture: "岩手", x: 10, y: 3 },
  { prefecture: "山形", x: 9, y: 4 },
  { prefecture: "宮城", x: 10, y: 4 },
  { prefecture: "福島", x: 9, y: 5 },

  // 関東地方
  { prefecture: "茨城", x: 10, y: 5 },
  { prefecture: "栃木", x: 9, y: 6 },
  { prefecture: "群馬", x: 8, y: 6 },
  { prefecture: "埼玉", x: 9, y: 7, spanY: 2 }, // 選挙区が多いので縦に大きく
  { prefecture: "千葉", x: 10, y: 7, spanY: 2 }, // 選挙区が多いので縦に大きく
  { prefecture: "東京", x: 9, y: 9, span: 2, spanY: 2 }, // 選挙区が最も多いので大きく
  { prefecture: "神奈川", x: 8, y: 9, spanY: 2 }, // 選挙区が多いので縦に大きく

  // 中部地方
  { prefecture: "新潟", x: 8, y: 5 },
  { prefecture: "富山", x: 7, y: 5 },
  { prefecture: "石川", x: 6, y: 4 },
  { prefecture: "福井", x: 6, y: 5 },
  { prefecture: "山梨", x: 8, y: 7 },
  { prefecture: "長野", x: 8, y: 6 },
  { prefecture: "岐阜", x: 7, y: 6 },
  { prefecture: "静岡", x: 8, y: 8 },
  { prefecture: "愛知", x: 7, y: 7, spanY: 2 }, // 選挙区が多いので縦に大きく

  // 近畿地方
  { prefecture: "三重", x: 6, y: 7 },
  { prefecture: "滋賀", x: 6, y: 6 },
  { prefecture: "京都", x: 5, y: 6 },
  { prefecture: "大阪", x: 5, y: 7, spanY: 2 }, // 選挙区が多いので縦に大きく
  { prefecture: "兵庫", x: 4, y: 6, spanY: 2 }, // 選挙区が多いので縦に大きく
  { prefecture: "奈良", x: 6, y: 8 },
  { prefecture: "和歌山", x: 5, y: 9 },

  // 中国地方
  { prefecture: "鳥取", x: 3, y: 5 },
  { prefecture: "島根", x: 2, y: 5 },
  { prefecture: "岡山", x: 4, y: 5 },
  { prefecture: "広島", x: 3, y: 6 },
  { prefecture: "山口", x: 2, y: 6 },

  // 四国地方
  { prefecture: "徳島", x: 5, y: 10 },
  { prefecture: "香川", x: 4, y: 8 },
  { prefecture: "愛媛", x: 3, y: 8 },
  { prefecture: "高知", x: 4, y: 9 },

  // 九州地方
  { prefecture: "福岡", x: 1, y: 7, spanY: 2 }, // 選挙区が多いので縦に大きく
  { prefecture: "佐賀", x: 0, y: 7 },
  { prefecture: "長崎", x: 0, y: 8 },
  { prefecture: "熊本", x: 1, y: 9 },
  { prefecture: "大分", x: 2, y: 7 },
  { prefecture: "宮崎", x: 2, y: 9 },
  { prefecture: "鹿児島", x: 1, y: 10 },
  { prefecture: "沖縄", x: 0, y: 11 }, // 沖縄は離れた位置に
];

// 平坦化して全ての都道府県の配置情報を取得
const allPrefecturePositions = prefectureLayout.flat();

const ElectionGridView = ({ politicians }: ElectionGridViewProps) => {
  // 衆議院の最新選挙年を取得（存在しない場合は最初の選挙年）
  const getLatestElectionYear = (years: number[]): number => {
    return years.length > 0 ? years[0] : 2024;
  };

  // 利用可能な選挙年を取得（議院ごと）
  const getElectionYearsByType = () => {
    const representativesYears = new Set<number>();
    const councillorsYears = new Set<number>();

    politicians.forEach((p) => {
      if (p.chamber === "representatives") {
        representativesYears.add(p.electionYear);
      } else if (p.chamber === "councillors") {
        councillorsYears.add(p.electionYear);
      }
    });

    const reps = Array.from(representativesYears).sort((a, b) => b - a);
    const couns = Array.from(councillorsYears).sort((a, b) => b - a);

    return {
      representatives: reps,
      councillors: couns,
      all: Array.from(new Set([...reps, ...couns])).sort((a, b) => b - a),
    };
  };

  const electionYearsByType = getElectionYearsByType();

  const [chamber, setChamber] = useState<"representatives" | "councillors">(
    "representatives"
  );

  // 初期選挙年を設定（衆議院の最新年）
  const initialElectionYear = getLatestElectionYear(
    electionYearsByType.representatives
  );
  const [electionYear, setElectionYear] = useState<number>(initialElectionYear);

  // 議院が変わったときに選挙年も更新する
  const handleChamberChange = (
    newChamber: "representatives" | "councillors"
  ) => {
    setChamber(newChamber);

    // 議院が変わったら、その議院の最新の選挙年を選択
    if (newChamber === "representatives") {
      setElectionYear(
        getLatestElectionYear(electionYearsByType.representatives)
      );
    } else if (newChamber === "councillors") {
      setElectionYear(getLatestElectionYear(electionYearsByType.councillors));
    }
  };

  // 利用可能な選挙年を取得（現在選択されている議院に基づく）
  const getAvailableElectionYears = () => {
    if (chamber === "representatives") {
      return electionYearsByType.representatives;
    } else {
      return electionYearsByType.councillors;
    }
  };

  const availableElectionYears = getAvailableElectionYears();

  // 県ごとに政治家をグループ化
  const getPrefecturePoliticians = () => {
    const prefecturePoliticians = new Map<string, Politician[]>();

    politicians.forEach((politician) => {
      // 議院フィルター
      if (politician.chamber !== chamber) {
        return; // 選択した議院に属さない場合はスキップ
      }

      // 選挙年フィルター
      if (politician.electionYear !== electionYear) {
        return; // 選択した選挙年に属さない場合はスキップ
      }

      const prefecture = extractPrefecture(politician.district);
      if (!prefecturePoliticians.has(prefecture)) {
        prefecturePoliticians.set(prefecture, []);
      }
      prefecturePoliticians.get(prefecture)?.push(politician);
    });

    return prefecturePoliticians;
  };

  // 党ごとに政治家をグループ化して表示する
  const renderPrefecturePartyBlocks = (prefecture: string) => {
    const prefecturePoliticians = getPrefecturePoliticians();
    const politiciansInPrefecture = prefecturePoliticians.get(prefecture) || [];

    // 選挙区ごとにグループ化して表示
    const districtGroups = new Map<string, Politician[]>();
    politiciansInPrefecture.forEach((politician) => {
      if (!districtGroups.has(politician.district)) {
        districtGroups.set(politician.district, []);
      }
      districtGroups.get(politician.district)?.push(politician);
    });

    // 選挙区ごとのブロックを作成
    const blocks = Array.from(districtGroups.entries()).map(
      ([district, pols], index) => {
        // 夫婦別姓反対の議員がいるかチェック
        const hasOpposition = pols.some((p) => p.separateLastName === "反対");
        // 当選した議員の党派を取得（最新の選挙年のものを取得）
        const latestElectionYear = Math.max(...pols.map((p) => p.electionYear));
        const electedPoliticians = pols.filter(
          (p) => p.electionYear === latestElectionYear
        );

        // 選挙区名から数字部分を取り出す（例：東京1区 → 1）
        const districtNumber = district.replace(/[^0-9]/g, "");
        const districtLabel = districtNumber
          ? districtNumber
          : district.replace(/.*選挙区/, "");

        return (
          <div
            key={`${district}-${index}`}
            className="district-block"
            style={{
              backgroundColor: hasOpposition ? "#D2B48C" : "#95a5a6", // ヤシノミ色 or グレー
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              color: "#fff",
              fontWeight: "bold",
              textShadow: "0 1px 1px rgba(0,0,0,0.5)",
            }}
            title={`${district}: ${
              hasOpposition
                ? "夫婦別姓に反対の議員あり"
                : "夫婦別姓に反対の議員なし"
            }\n${electedPoliticians
              .map((p) => `${p.name} (${p.party}): ${p.separateLastName}`)
              .join("\n")}`}
          >
            {districtLabel}
          </div>
        );
      }
    );

    // 最大9つまで表示し、それ以上は省略表示
    const maxBlocks = 9;
    if (blocks.length > maxBlocks) {
      const visibleBlocks = blocks.slice(0, maxBlocks - 1);
      const remainingCount = blocks.length - (maxBlocks - 1);

      return [
        ...visibleBlocks,
        <div
          key={`${prefecture}-more`}
          className="district-block more-districts"
          style={{
            backgroundColor: "#666",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            color: "#fff",
            fontWeight: "bold",
          }}
          title={`他に${remainingCount}選挙区あり`}
        >
          +{remainingCount}
        </div>,
      ];
    }

    return blocks;
  };

  // 県ごとのブロックを表示
  const renderPrefectureBlocks = () => {
    return prefectureLayout.map(({ prefecture, x, y, span = 1, spanY = 1 }) => {
      return (
        <div
          key={prefecture}
          className="prefecture-block"
          style={{
            gridColumn: `${x + 1} / span ${span}`,
            gridRow: `${y + 1} / span ${spanY}`,
          }}
        >
          <div className="prefecture-name">{prefecture}</div>
          <div className="party-grid">
            {renderPrefecturePartyBlocks(prefecture)}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="election-grid-container">
      <div className="controls">
        <div className="control-selector">
          <div className="chamber-selector">
            <label>
              議院:
              <select
                value={chamber}
                onChange={(e) =>
                  handleChamberChange(
                    e.target.value as "representatives" | "councillors"
                  )
                }
              >
                <option value="representatives">衆議院</option>
                <option value="councillors">参議院</option>
              </select>
            </label>
          </div>
          <div className="year-selector">
            <label>
              選挙年:
              <select
                value={electionYear.toString()}
                onChange={(e) => setElectionYear(parseInt(e.target.value))}
              >
                {availableElectionYears.map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="japan-grid-container">
        <div className="japan-grid">{renderPrefectureBlocks()}</div>
      </div>

      <div className="legend">
        <div className="legend-title">選挙区の状況</div>
        <div className="legend-item">
          <span
            className="color-box"
            style={{ backgroundColor: "#D2B48C" }}
          ></span>
          <span>選択的夫婦別姓に反対の議員が当選した選挙区</span>
        </div>
        <div className="legend-item">
          <span
            className="color-box"
            style={{ backgroundColor: "#95a5a6" }}
          ></span>
          <span>選択的夫婦別姓に反対の議員がいない選挙区</span>
        </div>
      </div>
    </div>
  );
};

export default ElectionGridView;
