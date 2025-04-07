import { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import { PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./ElectionMapView.css";

// leaflet アイコンの問題を修正 (URLで直接指定)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// 初期表示の設定
const DEFAULT_CENTER: [number, number] = [37, 137.5]; // より良い位置に調整
const DEFAULT_ZOOM = 4.5; // ズームを少し広く

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

interface ElectionMapViewProps {
  politicians: Politician[];
}

// 地図の色を定義
const colors: Record<string, string> = {
  反対あり: "#D2B48C", // ヤシの実のような色（タン）
  反対なし: "#95a5a6", // グレー
  default: "#f0f0f0", // デフォルト（データなし）
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

const ElectionMapView = ({ politicians }: ElectionMapViewProps) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chamber, setChamber] = useState<
    "representatives" | "councillors" | "all"
  >("representatives");
  const [mapKey, setMapKey] = useState<string>("initial");
  // 都道府県ごとの状態を保存するマップ
  const [prefectureStatusMap, setPrefectureStatusMap] = useState<
    Map<string, string>
  >(new Map());

  // 地図データを読み込む
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        console.log("Loading geo data...");
        const response = await fetch(
          "/yashinomi-map-viewer/geo/japan-prefectures.geojson"
        );
        if (!response.ok) {
          throw new Error("Failed to load geographic data");
        }
        const data = await response.json();
        console.log("GeoData loaded:", data);
        setGeoData(data);
      } catch (err) {
        console.error("Error loading geographic data:", err);
        setError("地図データの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    loadGeoData();
  }, []);

  // 表示タイプやチャンバーが変更されたらキーを変更して再レンダリング
  useEffect(() => {
    setMapKey(`${chamber}-${Date.now()}`);
    // 都道府県ごとの状態を計算
    calculatePrefectureStatus();
  }, [chamber, politicians]);

  // 都道府県ごとの状態を計算
  const calculatePrefectureStatus = () => {
    const statusMap = new Map<string, string>();
    const prefecturePoliticians = new Map<string, Politician[]>();

    // 政治家データを都道府県ごとにグループ化
    politicians.forEach((politician) => {
      if (chamber !== "all" && politician.chamber !== chamber) {
        return; // 選択した議院に属さない場合はスキップ
      }

      const prefecture = extractPrefecture(politician.district);
      if (!prefecturePoliticians.has(prefecture)) {
        prefecturePoliticians.set(prefecture, []);
      }
      prefecturePoliticians.get(prefecture)?.push(politician);
    });

    // 各都道府県について反対の議員がいるかチェック
    prefecturePoliticians.forEach((politicianList, prefecture) => {
      const hasOpposition = politicianList.some(
        (politician) => politician.separateLastName === "反対"
      );
      statusMap.set(prefecture, hasOpposition ? "反対あり" : "反対なし");
    });

    setPrefectureStatusMap(statusMap);
    console.log(
      "Prefecture status calculated:",
      Array.from(statusMap.entries())
    );
  };

  // 選挙区ごとの状況を判定する関数（夫婦別姓に反対の議員がいるかどうか）
  const getDistrictStatus = (districtName: string) => {
    const prefecture = extractPrefecture(districtName);

    if (!prefectureStatusMap.has(prefecture)) {
      return "default";
    }

    return prefectureStatusMap.get(prefecture) || "default";
  };

  // onEachFeature関数
  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties && feature.properties.name) {
      const prefName = feature.properties.name;

      // 都道府県名を正規化（"○○県"から"○○"に変換）
      let prefecture = prefName;
      if (
        prefecture.endsWith("都") ||
        prefecture.endsWith("府") ||
        prefecture.endsWith("県") ||
        prefecture.endsWith("道")
      ) {
        prefecture = prefecture.slice(0, -1);
      }

      // 特殊ケース処理
      if (prefecture === "北海") {
        prefecture = "北海道";
      }

      const status = getDistrictStatus(prefecture);

      // その県の政治家をフィルタリング
      const filtered = politicians.filter(
        (politician) =>
          (chamber === "all" || politician.chamber === chamber) &&
          extractPrefecture(politician.district) === prefecture
      );

      const oppositionCount = filtered.filter(
        (p) => p.separateLastName === "反対"
      ).length;
      const totalCount = filtered.length;

      let statusText = "";
      if (status === "default") {
        statusText = "データなし";
      } else if (status === "反対あり") {
        statusText = `反対議員: ${oppositionCount}/${totalCount}`;
      } else {
        statusText = `反対議員: 0/${totalCount}`;
      }

      layer.bindTooltip(
        `<div><strong>${prefName}</strong></div>
         <div>選択的夫婦別姓: ${statusText}</div>`,
        { permanent: false, direction: "top" }
      );
    }
  };

  // スタイル関数
  const styleFunction = (feature: any) => {
    if (feature.properties && feature.properties.name) {
      const prefName = feature.properties.name;

      // 都道府県名を正規化（"○○県"から"○○"に変換）
      let prefecture = prefName;
      if (
        prefecture.endsWith("都") ||
        prefecture.endsWith("府") ||
        prefecture.endsWith("県") ||
        prefecture.endsWith("道")
      ) {
        prefecture = prefecture.slice(0, -1);
      }

      // 特殊ケース処理
      if (prefecture === "北海") {
        prefecture = "北海道";
      }

      const status = getDistrictStatus(prefecture);

      const style: PathOptions = {
        fillColor: colors[status] || colors.default,
        weight: 1,
        opacity: 1,
        color: "#666",
        fillOpacity: 0.8,
      };

      return style;
    }

    return {
      fillColor: colors.default,
      weight: 1,
      opacity: 1,
      color: "#666",
      fillOpacity: 0.8,
    };
  };

  if (loading) {
    return <div className="loading-map">地図データを読み込み中...</div>;
  }

  if (error) {
    return <div className="error-map">{error}</div>;
  }

  if (!geoData) {
    return <div className="error-map">地図データを読み込めませんでした</div>;
  }

  console.log("Politicians count:", politicians.length);
  console.log("Current chamber:", chamber);

  return (
    <div className="election-map-container">
      <div className="controls">
        <div className="chamber-selector">
          <label>
            議院:
            <select
              value={chamber}
              onChange={(e) =>
                setChamber(
                  e.target.value as "representatives" | "councillors" | "all"
                )
              }
            >
              <option value="representatives">衆議院</option>
              <option value="councillors">参議院</option>
              <option value="all">全体</option>
            </select>
          </label>
        </div>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ width: "100%", height: "100%" }}
          key={mapKey}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {geoData && (
            <GeoJSON
              data={geoData}
              onEachFeature={onEachFeature}
              style={styleFunction}
            />
          )}
        </MapContainer>
      </div>

      <div className="legend">
        <div className="legend-item">
          <span
            className="color-box"
            style={{ backgroundColor: colors.反対あり }}
          ></span>
          <span>選択的夫婦別姓に反対の議員がいる都道府県</span>
        </div>
        <div className="legend-item">
          <span
            className="color-box"
            style={{ backgroundColor: colors.反対なし }}
          ></span>
          <span>選択的夫婦別姓に反対の議員がいない都道府県</span>
        </div>
        <div className="legend-item">
          <span
            className="color-box"
            style={{ backgroundColor: colors.default }}
          ></span>
          <span>データなし</span>
        </div>
      </div>
    </div>
  );
};

export default ElectionMapView;
