import { useParams, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./PrefectureDetailView.css";

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

interface PrefectureDetailViewProps {
  politicians: Politician[];
}

const PrefectureDetailView = ({ politicians }: PrefectureDetailViewProps) => {
  const { prefectureName } = useParams<{ prefectureName: string }>();
  const location = useLocation();

  // 各議院の最新選挙年を取得
  const getLatestElectionYear = (
    chamberType: "representatives" | "councillors"
  ): number => {
    const years = politicians
      .filter((p) => p.chamber === chamberType)
      .map((p) => p.electionYear);
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
    return uniqueYears.length > 0 ? uniqueYears[0] : 2024;
  };

  // URLから議院と選挙年のパラメータを取得、なければデフォルト値を設定
  const queryParams = new URLSearchParams(location.search);
  const defaultChamber =
    (queryParams.get("chamber") as "representatives" | "councillors") ||
    "representatives";
  const defaultElectionYear =
    parseInt(queryParams.get("year") || "0") ||
    getLatestElectionYear("representatives");

  const [chamber, setChamber] = useState<"representatives" | "councillors">(
    defaultChamber
  );
  const [electionYear, setElectionYear] = useState<number>(defaultElectionYear);

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
    };
  };

  const electionYearsByType = getElectionYearsByType();

  // 議院が変わったときに選挙年も更新する
  const handleChamberChange = (
    newChamber: "representatives" | "councillors"
  ) => {
    setChamber(newChamber);

    // 議院が変わったら、その議院の最新の選挙年を選択
    if (newChamber === "representatives") {
      setElectionYear(getLatestElectionYear("representatives"));
    } else {
      setElectionYear(getLatestElectionYear("councillors"));
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

  // 都道府県名から該当する政治家を抽出（選択した議院と選挙年でフィルタリング）
  const getPrefecturePoliticians = () => {
    return politicians.filter((politician) => {
      return (
        politician.district.startsWith(prefectureName || "") &&
        politician.chamber === chamber &&
        politician.electionYear === electionYear
      );
    });
  };

  const prefecturePoliticians = getPrefecturePoliticians();

  // 選挙区ごとにグループ化
  const getDistrictGroups = () => {
    const districtGroups = new Map<string, Politician[]>();

    prefecturePoliticians.forEach((politician) => {
      if (!districtGroups.has(politician.district)) {
        districtGroups.set(politician.district, []);
      }
      districtGroups.get(politician.district)?.push(politician);
    });

    return districtGroups;
  };

  const districtGroups = getDistrictGroups();

  // 議員の情報をカードとして表示
  const renderPoliticianCard = (politician: Politician) => {
    const handleCardClick = () => {
      const searchQuery = encodeURIComponent(
        `${politician.name} ${politician.party}`
      );
      window.open(`https://www.google.com/search?q=${searchQuery}`, "_blank");
    };

    return (
      <div
        key={`${politician.name}-${politician.electionYear}`}
        className="politician-card"
        style={{
          borderLeft: `5px solid ${
            politician.separateLastName === "賛成" ? "#95a5a6" : "#D2B48C"
          }`,
          cursor: "pointer",
        }}
        onClick={handleCardClick}
        title={`${politician.name}をGoogleで検索`}
      >
        <div className="politician-name">{politician.name}</div>
        <div className="politician-party">{politician.party}</div>
        <div className="politician-info">
          <div className="info-item">
            <span className="info-label">選択的夫婦別姓:</span>
            <span className="info-value">{politician.separateLastName}</span>
          </div>
          <div className="info-item">
            <span className="info-label">同性婚:</span>
            <span className="info-value">{politician.sameSexMarriage}</span>
          </div>
          <div className="info-item">
            <span className="info-label">選挙年:</span>
            <span className="info-value">{politician.electionYear}年</span>
          </div>
          <div className="info-item">
            <span className="info-label">議院:</span>
            <span className="info-value">
              {politician.chamber === "representatives" ? "衆議院" : "参議院"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (!prefectureName) {
    return <div className="error-message">都道府県が指定されていません。</div>;
  }

  return (
    <div className="prefecture-detail-container">
      <div className="back-link-container">
        <Link to="/" className="back-link">
          ← 戻る
        </Link>
      </div>
      <h1 className="prefecture-title">{prefectureName}の選挙区</h1>

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

      {prefecturePoliticians.length === 0 ? (
        <div className="error-message">
          選択した議院・選挙年のデータが見つかりませんでした。
        </div>
      ) : (
        <div className="districts-container">
          {Array.from(districtGroups.entries()).map(
            ([district, politicians]) => {
              // 夫婦別姓に賛成以外の議員がいるかチェック
              const hasOpposition = politicians.some(
                (p) => p.separateLastName !== "賛成"
              );

              return (
                <div key={district} className="district-section">
                  <h2 className="district-title">
                    {district}
                    <span
                      className="district-status"
                      style={{
                        backgroundColor: hasOpposition ? "#D2B48C" : "#95a5a6",
                        color: "#fff",
                      }}
                    >
                      {hasOpposition ? "賛成以外あり" : "全員賛成"}
                    </span>
                  </h2>
                  <div className="politicians-list">
                    {politicians.map((politician) =>
                      renderPoliticianCard(politician)
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
};

export default PrefectureDetailView;
