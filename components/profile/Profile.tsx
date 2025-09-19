import { FC, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button, Card, Chip, ActivityIndicator } from "react-native-paper";
import { UserContext } from "../../configs/Contexts";
import { api, endpoints } from "../../configs/Apis";
import EditProfileSheet, { EditProfileSheetRef } from "./EditProfileSheet";
import { mapNote, Note } from "../../configs/Types";
import { ProfileParamList } from "../../App";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import NoteCard from "../note/NoteCard";
import CreateNoteSheet, { CreateNoteSheetRef } from "../note/CreateNoteSheet";

// ===== SVG chart
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { bus } from "../../utils/EventBus";

type Props = NativeStackScreenProps<ProfileParamList, "profileStack">;

type StatsValuesResponseDTO = {
  day: string;           // "yyyy-MM-dd"
  mood_values: number[]; // nhiều điểm -2..+2 trong 1 ngày (đã chuẩn hóa ở BE)
};

const Profile: FC<Props> = ({ navigation }) => {
  const createRef = useRef<CreateNoteSheetRef>(null);
  const user = useContext(UserContext);
  const editRef = useRef<EditProfileSheetRef>(null);

  const openEdit = () => editRef.current?.open();

  /** ===== Notes (3 items) ===== */
  const [moodEntries, setMoodEntries] = useState<Note[]>([]);
  const loadMoodEntries = async () => {
    try {
      const res = await api.get("/mood-entries", { params: { size: 3 } });
      if (res.data?.content?.length > 0) {
        setMoodEntries(res.data.content.map((item: any) => mapNote(item)));
      } else setMoodEntries([]);
    } catch (err) {
      console.error(err);
      setMoodEntries([]);
    }
  };
  useEffect(() => {
    loadMoodEntries();
  }, []);

  /** ===== Stats (30 ngày gần đây) ===== */
  const [stats, setStats] = useState<StatsValuesResponseDTO[] | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  const today = useMemo(() => new Date(), []);
  const toStr = (d: Date) => d.toISOString().slice(0, 10);
  const fromDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return d;
  }, [today]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get(endpoints.stats, {
        params: { from: toStr(fromDate), to: toStr(today) },
      });
      setStats(res.data ?? []);
      console.info(res.data);
    } catch (e) {
      console.error(e);
      setStats([]);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [fromDate, today]);

  useEffect(() => {
    const sub = bus.addListener("note:changed", () => {
      loadMoodEntries();
      loadStats();
    });
    return () => sub.remove();
  }, []);

  /** ===== Pull to refresh (notes + stats) ===== */
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadMoodEntries(), loadStats()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.wrapper} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1F509A"
            colors={["#1F509A"]}
          />
        }
      >
        {/* ===== Profile Card ===== */}
        <Card style={styles.card}>
          <Card.Content style={styles.header}>
            <Text style={styles.name}>
              {(user?.firstName ?? "") + " " + (user?.lastName ?? "")}
            </Text>

            <View style={styles.actionRow}>
              <Button
                mode="outlined"
                textColor="#1c85fc"
                style={styles.editBtn}
                onPress={openEdit}
              >
                Chỉnh sửa thông tin
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* ===== Stats Card ===== */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Thống kê cảm xúc</Text>
              <Chip compact mode="flat" style={styles.rangeChip}>
                30 ngày gần đây
              </Chip>
            </View>

            {loadingStats ? (
              <View style={[styles.chartPlaceholder, { borderWidth: 0 }]}>
                <ActivityIndicator />
                <Text style={{ color: "#6b7280", marginTop: 8 }}>Đang tải thống kê…</Text>
              </View>
            ) : !stats || stats.length === 0 || stats.every(d => !d.mood_values?.length) ? (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>Chưa có dữ liệu thống kê.</Text>
                <Button mode="contained" style={{ marginTop: 10 }} onPress={loadStats}>
                  Thử lại
                </Button>
              </View>
            ) : (
              <MoodDotsChart
                data={stats}
                height={200}
                padding={16}
                yTicks={[-2, -1, 0, 1, 2]}
              />
            )}

            {/* Legend */}
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: "#7C3AED" }]} />
              <Text style={styles.legendText}>Điểm cảm xúc mỗi lần ghi</Text>
            </View>
          </Card.Content>
        </Card>

        {/* ===== Notes ===== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nhật ký gần đây</Text>
          <Button
            compact
            mode="text"
            onPress={() => {
              navigation.navigate("notes");
            }}
            style={styles.viewAllBtn}
            labelStyle={styles.viewAllLabel}
          >
            Xem tất cả
          </Button>
        </View>

        {moodEntries.length === 0 ? (
          <Card style={styles.card}>
            <Card.Content style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text style={{ color: "#6b7280", marginBottom: 8 }}>
                Chưa có nhật ký nào.
              </Text>
              <Button mode="contained" onPress={() => createRef.current?.open()}>
                Tạo nhật ký đầu tiên
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {moodEntries.map((m) => (
              <NoteCard key={m.id} note={m} navigation={navigation} />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Sheets */}
      <CreateNoteSheet
        ref={createRef}
        onCreated={() => {
          loadMoodEntries();
          loadStats();
        }}
      />
      <EditProfileSheet ref={editRef} />
    </SafeAreaView>
  );
};
/* ================== Mini Dots+Line Chart Component (adaptive day width) ================== */
const MoodDotsChart: FC<{
  data: StatsValuesResponseDTO[];
  height?: number;
  padding?: number;
  yTicks?: number[];
}> = ({ data, height = 200, padding = 16, yTicks = [-2, -1, 0, 1, 2] }) => {
  // Nhãn trục X ("MM-dd")
  const labels = useMemo(() => data.map(d => d.day.slice(5)), [data]);

  // Giá trị theo ngày
  const series = useMemo(() => data.map(d => d.mood_values ?? []), [data]);

  // Kích thước chart
  const width = 320;                // có thể thay bằng width thực tế nếu cần
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  // Domain Y: -2..2 (khớp mapping bên BE)
  const yMin = -2, yMax = 2;

  const yFor = (v: number) => {
    const t = (v - yMin) / (yMax - yMin);
    return padding + chartH - t * chartH;
  };
  const yZero = yFor(0);

  // ===== Giãn rộng cột theo số điểm trong ngày =====
  // Tính "trọng số" cho mỗi ngày: 1 + factor*(n-1), có giới hạn trên.
  const { weights, totalWeight, cumWeights } = useMemo(() => {
    const counts = series.map(s => s.length);
    const factor = 0.35;           // độ nhạy giãn (0.2..0.4 nhìn ổn)
    const maxFactor = 2.0;         // cột rộng tối đa = 2x cột chuẩn
    const w = counts.map(n => Math.min(1 + factor * Math.max(0, n - 1), maxFactor));
    const total = w.reduce((a, b) => a + b, 0) || 1;
    const cum: number[] = [];
    let acc = 0;
    for (let i = 0; i < w.length; i++) {
      cum.push(acc);
      acc += w[i];
    }
    return { weights: w, totalWeight: total, cumWeights: cum };
  }, [series]);

  // Hàm lấy toạ độ X tâm cột theo trọng số
  const xCenterForDay = (dayIdx: number) => {
    const left = cumWeights[dayIdx];
    const w = weights[dayIdx];
    // vị trí trung tâm dải ngày theo tỉ lệ trọng số trên tổng
    const t = (left + w / 2) / totalWeight;
    return padding + t * chartW;
  };

  // Chiều rộng (pixel) của cột ngày -> dùng để tính jitter nội bộ
  const dayPixelWidth = (dayIdx: number) => (weights[dayIdx] / totalWeight) * chartW;

  // Khoảng cách giữa các chấm trong cùng 1 ngày (căn giữa, không đè lên nhau)
  const jitterGapForDay = (dayIdx: number, count: number) => {
    if (count <= 1) return 0;
    const px = dayPixelWidth(dayIdx);
    // chừa biên ~50%/mỗi bên để đường line không chạm rìa, chia đều cho n điểm
    const gap = Math.min(10, px / Math.max(3, count + 1));
    return gap;
  };

  // ===== Tạo danh sách điểm (x,y) để vẽ LINE nối các chấm =====
  const points = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    series.forEach((vals, dayIdx) => {
      const n = vals.length;
      const center = xCenterForDay(dayIdx);
      const gap = jitterGapForDay(dayIdx, n);
      vals.forEach((v, j) => {
        // offset đối xứng quanh tâm: ..., -gap, 0, +gap, ...
        const offset = gap * (j - (n - 1) / 2);
        pts.push({ x: center + offset, y: yFor(v) });
      });
    });
    return pts;
  }, [series, weights, totalWeight]);

  // Build path nối các điểm (theo thứ tự duyệt ở trên)
  const lineD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
    return d;
  }, [points]);

  return (
    <View style={{ marginTop: 8, marginBottom: 12 }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopOpacity="1" stopColor="#ffffff" />
            <Stop offset="1" stopOpacity="1" stopColor="#f9fbff" />
          </LinearGradient>
        </Defs>

        {/* Background */}
        <Rect x={0} y={0} width={width} height={height} fill="url(#bg)" rx={12} />

        {/* Grid ngang */}
        <G>
          {yTicks.map((t, idx) => {
            const y = yFor(t);
            return (
              <G key={`grid-${idx}`}>
                <Line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeDasharray="4 6"
                  strokeWidth={1}
                />
              </G>
            );
          })}
        </G>

        {/* Zero line */}
        <Line
          x1={padding}
          y1={yZero}
          x2={width - padding}
          y2={yZero}
          stroke="#CBD5E1"
          strokeWidth={1.2}
        />

        {/* LINE nối các chấm */}
        {lineD ? <Path d={lineD} stroke="#7C3AED" strokeWidth={2} fill="none" /> : null}

        {/* Dots: mỗi ngày có nhiều giá trị, giãn trong dải cột của ngày đó */}
        <G>
          {series.map((vals, dayIdx) => {
            const n = vals.length;
            const center = xCenterForDay(dayIdx);
            const gap = jitterGapForDay(dayIdx, n);
            return vals.map((v, j) => {
              const offset = gap * (j - (n - 1) / 2);
              return (
                <Circle
                  key={`d-${dayIdx}-${j}`}
                  cx={center + offset}
                  cy={yFor(v)}
                  r={3.5}
                  fill="#7C3AED"
                  opacity={0.9}
                />
              );
            });
          })}
        </G>
      </Svg>

      {/* Trục X: hiển thị nhãn 2 đầu như cũ (giản lược) */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 8, marginTop: 4 }}>
        {labels.map((lb, i) => (
          <Text key={`lb-${i}`} style={{ fontSize: 11, color: "#6b7280" }}>
            {i === 0 || i === labels.length - 1 ? lb : " "}
          </Text>
        ))}
      </View>
    </View>
  );
};


/* ================== Styles ================== */

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f9fcff",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "white",
    elevation: 2,
    marginBottom: 16,
  },
  header: {
    alignItems: "flex-start",
    paddingVertical: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0b203a",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
  },
  editBtn: {
    flex: 1,
    borderRadius: 12,
    borderColor: "#1c85fc",
  },

  /* ===== Section Header ===== */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0b203a",
  },
  viewAllBtn: {
    marginRight: -8,
  },
  viewAllLabel: {
    fontSize: 14,
  },

  /* ===== Stats card ===== */
  rangeChip: {
    backgroundColor: "#EEF5FF",
  },
  chartPlaceholder: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1.2,
    borderStyle: "dashed",
    borderColor: "#c7d2fe",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  chartPlaceholderText: {
    color: "#6b7280",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: "#4b5563",
  },
});

export default Profile;
