import React, { FC, useEffect, useRef, useState } from "react";
import {
    View,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    LayoutChangeEvent,
    RefreshControl,
    TextStyle,
    ViewStyle,
    ImageStyle,
    Pressable,
} from "react-native";
import {
    Text,
    TextInput,
    ActivityIndicator,
    useTheme,
    Button,
    Badge,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { api, endpoints } from "../../configs/Apis";
import { useSnackbar } from "../../configs/Contexts";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown, { type MarkdownProps } from "react-native-markdown-display";
import * as Clipboard from "expo-clipboard";
import { ApiPage } from "../../configs/Types";
import TopBar from "../common/TopBar";
import FeedbackSheet, { FeedbackSheetRef } from "../FeedbackSheet";
import WarningDialog from "../common/WarningDialog";

type Role = "user" | "assistant";
type MsgStatus = "sending" | "failed" | "sent";

type ApiMessage = {
    id: number;
    sender: "BOT" | "USER";
    content: string;
    created_at: string;
    is_crisis?: boolean;
    can_feedback?: boolean;
};

type ChatMsg = {
    id: string;
    role: Role;
    content: string;
    createdAt: number;
    status?: MsgStatus;
    crisis?: boolean;
    canFeedback?: boolean;
};

type MDStyles = NonNullable<MarkdownProps["style"]>;

const ChatScreen: FC = () => {
    const MIN_INPUT_H = 40;
    const MAX_INPUT_H = 120;

    const feedbackRef = useRef(null);
    const warnRef = useRef(null);

    const openFeedbackForMsg = (item: any) => {
        if (item.canFeedback == false)
            feedbackRef.current?.openExists(Number(item.id), "MESSAGE");
        else
            feedbackRef.current?.open(Number(item.id), "MESSAGE");
    };

    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { showSnackbar } = useSnackbar();

    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [inputBarH, setInputBarH] = useState(56);
    const [inputH, setInputH] = useState(MIN_INPUT_H);

    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [page, setPage] = useState(0);
    const [hasNext, setHasNext] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Tự lớn lên theo nội dung, clamp [MIN, MAX]
    const onInputContentSizeChange = (e: any) => {
        const raw = Math.ceil(e?.nativeEvent?.contentSize?.height ?? MIN_INPUT_H);
        const next = Math.max(MIN_INPUT_H, Math.min(MAX_INPUT_H, raw));
        if (next !== inputH) setInputH(next);
    };

    // Cập nhật chiều cao thanh input (cả khối, gồm nút gửi) để FlatList chừa chỗ
    const onInputBarLayout = (e: LayoutChangeEvent) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h !== inputBarH) setInputBarH(h);
    };


    const listRef = useRef<FlatList<ChatMsg>>(null);
    const needAutoScrollRef = useRef(false);
    const [showScrollToLatest, setShowScrollToLatest] = useState(false);
    const SCROLL_THRESHOLD = 120;

    const scrollToBottom = () => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    useEffect(() => {
        if (needAutoScrollRef.current) {
            needAutoScrollRef.current = false;
            requestAnimationFrame(() => {
                scrollToBottom();
            });
        }
    }, [messages.length]);

    const mapApiToChat = (m: ApiMessage): ChatMsg => ({
        id: String(m.id),
        role: m.sender === "BOT" ? "assistant" : "user",
        content: m.content,
        createdAt: new Date(m.created_at).getTime(),
        crisis: m.is_crisis ?? false,
        canFeedback: m.can_feedback ?? true
    });

    const loadPage = async (p: number, append = true) => {
        const res = await api.get<ApiPage>(endpoints.messages, {
            params: { page: p },
        });
        const data = res.data;

        const mapped = data.content.map(mapApiToChat);

        setHasNext(
            typeof data.hasNext === "boolean"
                ? data.hasNext
                : data.page < (data.totalPages ?? 1) - 1
        );
        setPage(data.page);

        setMessages(prev => {
            const base = (!append || p === 0) ? [] : prev;
            // tránh trùng id khi backend trả đè
            const exists = new Set(base.map(m => m.id));
            const merged = [...base, ...mapped.filter(m => !exists.has(m.id))];
            return merged;
        });
    };


    useEffect(() => {
        (async () => {
            try { await loadPage(0, false); }
            catch { showSnackbar?.("Không tải được hội thoại. Kéo để thử lại nhé!"); }
            finally { setInitialLoading(false); }
        })();
    }, []);

    const onEndReached = async () => {
        if (loadingMore || initialLoading || !hasNext) return;
        setLoadingMore(true);
        try {
            const next = page + 1;
            await loadPage(next, true);     // ⬅️ truyền số trang
        } catch {
            showSnackbar?.("Không tải được tin nhắn cũ.");
        } finally {
            setLoadingMore(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await loadPage(0, false);
            showSnackbar?.("Đã cập nhật cuộc trò chuyện.");
        } catch {
            showSnackbar?.("Làm mới thất bại.");
        } finally {
            setRefreshing(false);
        }
    };

    const markMsg = (id: string, patch: Partial<ChatMsg>) =>
        setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));

    const sendToApi = async (tempUserMsg: ChatMsg) => {
        try {
            const { data } = await api.post(endpoints.messages, { content: tempUserMsg.content });

            // Đánh dấu tin nhắn tạm của user là "sent"
            markMsg(tempUserMsg.id, { status: "sent" as MsgStatus });

            let botApiMsg = data as ApiMessage;

            if (botApiMsg) {
                const botChat = mapApiToChat(botApiMsg);
                if (botChat.crisis === true) {
                    warnRef?.current?.open();
                }
                setMessages(prev =>
                    prev.some(m => m.id === botChat.id) ? prev : [botChat, ...prev]
                );

            }
        } catch (e) {
            markMsg(tempUserMsg.id, { status: "failed" as MsgStatus });
            showSnackbar?.("Gửi tin nhắn thất bại. Thử lại nha!");
        }
    };


    const onSend = async (raw?: string) => {
        const content = (raw ?? text).trim();
        if (!content || sending) return;

        const tempUserMsg: ChatMsg = {
            id: `u-${Date.now()}`,
            role: "user",
            content,
            status: "sending",
            createdAt: Date.now(),
        };

        needAutoScrollRef.current = true; // cuộn tới dưới cùng 

        setMessages(prev => [tempUserMsg, ...prev]);
        setText("");
        setSending(true);
        await sendToApi(tempUserMsg);
        setSending(false);
    };

    const onRetry = async (msg: ChatMsg) => {
        if (sending) return;
        markMsg(msg.id, { status: "sending" });
        setSending(true);
        await sendToApi(msg);
        setSending(false);
    };

    const formatTime = (epochMs: number) => {
        const d = new Date(epochMs); const now = new Date();
        const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        return sameDay ? hhmm : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${hhmm}`;
    };

    // ===== Markdown styles =====
    const mdCommon = {
        body: { fontSize: 16, lineHeight: 22 } as TextStyle,
        strong: { fontWeight: "700" } as TextStyle,
        em: { fontStyle: "italic" } as TextStyle,
        bullet_list: { marginVertical: 4 } as ViewStyle,
        ordered_list: { marginVertical: 4 } as ViewStyle,
        list_item: { marginVertical: 2 } as ViewStyle,
        blockquote: {
            borderLeftWidth: 3, borderLeftColor: "#CBD5E1", paddingLeft: 10, marginVertical: 6,
        } as ViewStyle,
        code_inline: {
            fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
            backgroundColor: "#EEF2FF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
        } as TextStyle,
        code_block: {
            fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
            backgroundColor: "#0B1220", borderRadius: 10, padding: 10, lineHeight: 20, color: "#E5E7EB", overflow: "hidden",
        } as TextStyle,
        fence: {} as TextStyle,
        image: { display: "none" } as ImageStyle,
    } as const;

    const mdAssistant: MDStyles = {
        ...mdCommon,
        body: { ...mdCommon.body, color: "#1f2937" },
        strong: { ...mdCommon.strong, color: "#111827" },
        link: { color: theme.colors.primary, textDecorationLine: "underline" },
    };

    const mdUser: MDStyles = {
        ...mdCommon,
        body: { ...mdCommon.body, color: "white" },
        strong: { ...mdCommon.strong, color: "white" },
        em: { ...mdCommon.em, color: "white" },
        link: { color: "#E0E7FF", textDecorationLine: "underline" },
        code_inline: { ...mdCommon.code_inline, backgroundColor: "rgba(255,255,255,0.18)", color: "white" },
    };

    const renderItem = ({ item }: { item: ChatMsg }) => {
        const isUser = item.role === "user";
        const failed = isUser && item.status === "failed";
        const isSending = isUser && item.status === "sending";

        const bubbleStyle = isUser
            ? failed
                ? { backgroundColor: "#fee2e2", borderTopLeftRadius: 16, borderTopRightRadius: 4, borderWidth: 1, borderColor: "#ef4444" }
                : { backgroundColor: theme.colors.primary, borderTopLeftRadius: 16, borderTopRightRadius: 4 }
            : { backgroundColor: "#F4F6FA", borderTopLeftRadius: 4, borderTopRightRadius: 16 };

        return (
            <View style={[styles.row, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
                {!isUser && (
                    <View style={[styles.avatar, { backgroundColor: "#E6EEF9" }]}>
                        <Ionicons name="chatbubbles" size={16} color={theme.colors.primary} />
                    </View>
                )}

                {/* bubble container (chỉ 1 lớp) */}
                <View style={{ maxWidth: "82%" }}>
                    <Pressable
                        onLongPress={async () => { await Clipboard.setStringAsync(item.content); showSnackbar?.("Đã sao chép nội dung"); }}
                        delayLongPress={250}
                    >
                        <View style={[styles.bubble, bubbleStyle]}>
                            <Markdown
                                style={isUser ? mdUser : mdAssistant}
                            >
                                {item.content}
                            </Markdown>
                        </View>
                    </Pressable>

                    {/* meta dưới bubble + phản hồi cùng hàng */}
                    <View style={[styles.metaRow, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
                        {failed && (
                            <View style={styles.metaItem}>
                                <Ionicons name="warning-outline" size={14} color="#ef4444" />
                                <Text style={[styles.metaText, { color: "#ef4444" }]}>Gửi thất bại</Text>
                                <Button
                                    mode="text"
                                    compact
                                    onPress={() => onRetry(item)}
                                    icon="reload"
                                    style={{ marginLeft: 4 }}
                                    contentStyle={{ paddingHorizontal: 0 }}
                                    labelStyle={{ fontSize: 13 }}
                                >
                                    Gửi lại
                                </Button>
                            </View>
                        )}

                        {!isSending && (
                            <View style={[styles.metaItem, { marginLeft: isUser ? 8 : 0 }]}>
                                <Text style={[styles.metaText, { color: "#6b7280" }]}>
                                    {formatTime(item.createdAt)}
                                </Text>

                                {/* chỉ assistant + id là số => hiện Phản hồi */}
                                {!isUser && /^\d+$/.test(item.id) && (
                                    <Button
                                        mode="text"
                                        compact
                                        onPress={() => openFeedbackForMsg(item)}
                                        style={{ paddingHorizontal: 0, marginLeft: 6 }}
                                        contentStyle={{ paddingHorizontal: 0, minHeight: 0 }}
                                        labelStyle={{ fontSize: 13, color: "#1c85fc", fontWeight: "700" }}
                                    >
                                        {item.canFeedback ? "Phản hồi" : "Xem phản hồi"}
                                    </Button>
                                )}
                            </View>
                        )}
                    </View>

                </View>
            </View>
        );
    };

    const renderTyping = () => {
        if (!sending) return null;
        return (
            <View style={[styles.row, { justifyContent: "flex-start" }]}>
                <View style={[styles.avatar, { backgroundColor: "#E6EEF9" }]}>
                    <Ionicons name="chatbubbles" size={16} color={theme.colors.primary} />
                </View>
                <View style={[styles.bubble, { backgroundColor: "#F4F6FA" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ActivityIndicator size="small" />
                        <Text style={{ color: "#4b5563" }}>Đang soạn câu trả lời…</Text>
                    </View>
                </View>
            </View>
        );
    };

    const ListFooter = () => !loadingMore ? null : (
        <View style={{ paddingVertical: 64, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 6, color: "#6b7280" }}>Đang tải tin nhắn cũ…</Text>
        </View>
    );

    const EmptyState = () => initialLoading ? (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
            <ActivityIndicator />
        </View>
    ) : (
        <View style={{ alignItems: "center", paddingVertical: 64 }}>
            <Text style={{ color: "#6b7280" }}>Hãy gửi lời chào để bắt đầu trò chuyện nhé 👋</Text>
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
            <TopBar title="Trò chuyện với Chatbot Lucy" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
            >
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(it) => it.id}
                    renderItem={renderItem}
                    inverted
                    onEndReachedThreshold={0.05}
                    maintainVisibleContentPosition={{
                        minIndexForVisible: 0,
                        autoscrollToTopThreshold: 20,
                    }}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        padding: 16,
                        gap: 10,
                        paddingBottom: 64
                    }}
                    onScroll={(e) => {
                        const y = e.nativeEvent.contentOffset.y;
                        setShowScrollToLatest(y > SCROLL_THRESHOLD);
                    }}
                    ListHeaderComponent={renderTyping}
                    ListFooterComponent={ListFooter}
                    ListEmptyComponent={EmptyState}
                    onEndReached={onEndReached}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />

                <View onLayout={onInputBarLayout} style={[styles.inputBar]}>
                    <View style={styles.inputRow}>
                        <TextInput
                            mode="outlined"
                            placeholder="Nhập tin nhắn…"
                            value={text}
                            onChangeText={setText}
                            multiline
                            numberOfLines={1}
                            onContentSizeChange={onInputContentSizeChange}
                            scrollEnabled={inputH >= MAX_INPUT_H}
                            style={[styles.input, { height: inputH }]}
                            outlineStyle={{ borderRadius: 16 }}
                            underlineColor="transparent"
                            autoCorrect
                            autoCapitalize="sentences"
                            returnKeyType="send"
                            {...(Platform.OS === "android" ? { textAlignVertical: "top" as const } : {})}
                            onKeyPress={(e: any) => {
                                if ((e.nativeEvent?.key === "Enter") && (e.nativeEvent?.ctrlKey || e.nativeEvent?.metaKey)) {
                                    e.preventDefault?.();
                                    onSend();
                                }
                            }}
                        />

                        <Button
                            mode="contained"
                            onPress={() => onSend()}
                            disabled={sending || !text.trim()}
                            style={[
                                styles.sendBtn,
                                (sending || !text.trim()) && { opacity: 0.4 },
                            ]}
                            // chiều cao nút = chiều cao input
                            contentStyle={[styles.sendBtnContent, { height: inputH }]}
                            labelStyle={styles.sendBtnLabel}
                        >
                            Gửi
                        </Button>
                    </View>
                </View>
                {showScrollToLatest && (
                    <Pressable
                        onPress={scrollToBottom}
                        style={[
                            styles.scrollFab,
                            { bottom: inputBarH + 12 } // nằm trên input bar 1 chút
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="chevron-down" size={20} color="white" />
                    </Pressable>
                )}
            </KeyboardAvoidingView>
            <FeedbackSheet
                ref={feedbackRef}
                onSubmitted={() => {
                    loadPage(0, false);
                }}
            />
            <WarningDialog
                ref={warnRef}
            />
        </SafeAreaView>
    );
};

export default ChatScreen;

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8
    },
    avatar: {
        width: 24,

        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center"
    },
    bubble: {
        paddingHorizontal: 10,
        paddingVertical: 0,
        borderRadius: 16
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        gap: 8
    },
    metaText: {
        fontSize: 12,
        fontWeight: "600"
    },
    metaItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6
    },

    inputBar: {
        paddingHorizontal: 12,
        paddingTop: 11,
        paddingBottom: 22,
        backgroundColor: "#f9fbff",
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: "white",
    },
    sendBtn: {
        borderRadius: 16,
        marginBottom: 2,
        justifyContent: "center",
        backgroundColor: "#1F509A",
    },
    sendBtnContent: {
    },
    sendBtnLabel: {
        fontSize: 16,
        fontWeight: "700",
    },
    scrollFab: {
        position: "absolute",
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#1F509A",
        alignItems: "center",
        justifyContent: "center",
        // shadow iOS
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        // elevation Android
        elevation: 5,
    },
});
