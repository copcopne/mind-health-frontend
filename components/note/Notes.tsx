import { FC, useEffect, useRef, useState } from "react";
import { StyleSheet, View, RefreshControl, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import TopBar from "../common/TopBar";
import { api, endpoints } from "../../configs/Apis";
import { ApiPage, mapNote, Note } from "../../configs/Types";
import NoteCard from "../note/NoteCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_SIZE = 10;

const Notes: FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const headerH = insets.top + 56; // chiều cao TopBar (safe area + 56)

  const [notes, setNotes] = useState<Note[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const listRef = useRef<FlatList<Note>>(null);

  const mapResponse = (res: ApiPage) => {
    const mapped = (res.content ?? []).map(mapNote);
    const next =
      typeof res.hasNext === "boolean"
        ? res.hasNext
        : (res.totalPages ?? 1) - 1 > res.page;

    return { mapped, next, curPage: res.page };
  };

  const loadPage = async (p: number, append: boolean) => {
    const res = await api.get<ApiPage>(endpoints.moodEntries, {
      params: { page: p, size: PAGE_SIZE },
    });
    const { mapped, next, curPage } = mapResponse(res.data);

    setHasNext(next);
    setPage(curPage);

    setNotes((prev) => {
      const base = append ? prev : [];
      const exists = new Set(base.map((n) => n.id));
      return [...base, ...mapped.filter((n) => !exists.has(n.id))];
    });
  };

  useEffect(() => {
    (async () => {
      try {
        await loadPage(0, false);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPage(0, false);
    } finally {
      setRefreshing(false);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const onEndReached = async () => {
    if (initialLoading || refreshing || loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const ListEmpty = () =>
    initialLoading ? (
      <View style={styles.centerBox}>
        <ActivityIndicator />
        <Text style={styles.muted}>Đang tải nhật ký…</Text>
      </View>
    ) : (
      <View style={styles.centerBox}>
        <Text style={styles.muted}>Chưa có nhật ký nào</Text>
      </View>
    );

  const ListFooter = () =>
    !loadingMore ? null : (
      <View style={{ paddingVertical: 14, alignItems: "center" }}>
        <ActivityIndicator />
        <Text style={[styles.muted, { marginTop: 6 }]}>Đang tải thêm…</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.wrapper} edges={["top"]}>
      <TopBar onBack={() => navigation.goBack()} title="Danh sách nhật ký" />

      <FlatList
        ref={listRef}
        data={notes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NoteCard note={item} navigation={navigation} />}
        contentContainerStyle={[styles.listContent, { paddingTop: headerH }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={headerH}
          />
        }
        onEndReachedThreshold={0.25}
        onEndReached={onEndReached}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#f9fcff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  centerBox: {
    alignItems: "center",
    paddingVertical: 24,
  },
  muted: {
    color: "#6b7280",
    marginTop: 6,
  },
});

export default Notes;
