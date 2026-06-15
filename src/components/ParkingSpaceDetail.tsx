import { useState } from "react";
import {
    MessageSquarePlus,
    Mountain,
    Navigation,
    Star as StarIcon,
    X,
    ThumbsUp,
    ThumbsDown,
    User,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { distanceKm, type LatLng, type ParkingSpace } from "@/lib/types";
import {
    useCreateComment,
    useCreateReview,
    useUpdateComment,
    useUpdateReview,
    useSpaceComments,
    useSpaceReviews,
    useUpvoteComment,
    useDeleteUpvoteComment,
    useDownvoteComment,
    useDeleteDownvoteComment,
    useAdminDeleteReview,
    useAdminDeleteComment,
    useDeleteReview,
    useDeleteComment,
} from "@/lib/hooks";
import { userIsStaff, userIsAdmin } from "@/lib/roles";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "sonner";

type Props = {
    parkingSpace: ParkingSpace;
    userPos: LatLng | null;
    onClose: () => void;
    canInteract: boolean;
    onRequireLogin: () => void;
    inSheet?: boolean;
};

const MAX_LEN = 300;

const EXCLUDED_TAGS = new Set(["name", "amenity"]);

export function ParkingSpaceDetail({ parkingSpace, userPos, onClose, canInteract, onRequireLogin, inSheet }: Props) {
    const [ratingOpen, setRatingOpen] = useState(false);
    const [commentOpen, setCommentOpen] = useState(false);
    const [myRating, setMyRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [comment, setComment] = useState("");

    const reviewsQ = useSpaceReviews(parkingSpace.osmId);
    const commentsQ = useSpaceComments(parkingSpace.osmId);
    const createReview = useCreateReview();
    const createComment = useCreateComment();
    const updateReview = useUpdateReview();
    const updateComment = useUpdateComment();
    const currentUser = useAuthStore((s) => s.user);
    const isStaff = userIsStaff(currentUser);
    const isAdmin = userIsAdmin(currentUser);
    const upvoteComment = useUpvoteComment();
    const deleteUpvoteComment = useDeleteUpvoteComment();
    const downvoteComment = useDownvoteComment();
    const deleteDownvoteComment = useDeleteDownvoteComment();

    // admin delete hooks
    const adminDeleteReview = useAdminDeleteReview();
    const adminDeleteComment = useAdminDeleteComment();
    // regular delete hooks
    const deleteReview = useDeleteReview();
    const deleteComment = useDeleteComment();

    // state for delete confirmation modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: "review" | "comment"; id: number } | null>(null);

    const handleDeleteClick = (type: "review" | "comment", id: number) => {
        setDeleteTarget({ type, id });
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        if (isStaff || isAdmin) {
            if (deleteTarget.type === "review") await adminDeleteReview.mutateAsync(deleteTarget.id);
            else await adminDeleteComment.mutateAsync(deleteTarget.id);
        } else {
            // Regular users delete their own review/comment by space osmId
            if (deleteTarget.type === "review") await deleteReview.mutateAsync(parkingSpace.osmId);
            else await deleteComment.mutateAsync(parkingSpace.osmId);
        }
        setDeleteModalOpen(false);
        setDeleteTarget(null);
    };

    const dist = userPos ? distanceKm(userPos, parkingSpace) : null;

    const reviews = reviewsQ.data ?? [];
    const comments = commentsQ.data ?? [];
    const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : parkingSpace.rating;

    const requireLogin = () => {
        if (!canInteract) {
            onRequireLogin();
            return false;
        }
        return true;
    };

    const submitReview = async () => {
        if (!currentUser) {
            toast.error("Bitte einloggen, um eine Bewertung zu schreiben");
            return;
        }
        const existing = reviews.find((r) => r.user?.id === currentUser.id);
        try {
            if (existing) {
                await updateReview.mutateAsync({
                    osmId: parkingSpace.osmId,
                    stars: myRating,
                    reviewText: reviewText,
                });
                toast.success("Bewertung aktualisiert");
            } else {
                await createReview.mutateAsync({
                    osmId: parkingSpace.osmId,
                    stars: myRating,
                    reviewText: reviewText,
                });
                toast.success("Bewertung gespeichert");
            }
            setRatingOpen(false);
            setMyRating(0);
        } catch (error) {
            console.warn(error);
            toast.error("Bewertung konnte nicht gespeichert werden");
        }
    };

    const submitComment = async () => {
        if (!currentUser) {
            toast.error("Bitte einloggen, um einen Kommentar zu schreiben");
            return;
        }
        const existing = comments.find((c) => c.user?.id === currentUser.id);
        try {
            if (existing) {
                await updateComment.mutateAsync({
                    osmId: parkingSpace.osmId,
                    commentText: comment,
                });
                toast.success("Kommentar aktualisiert");
            } else {
                await createComment.mutateAsync({
                    osmId: parkingSpace.osmId,
                    commentText: comment,
                });
                toast.success("Kommentar gespeichert");
            }
            setCommentOpen(false);
            setComment("");
        } catch (error) {
            console.warn(error);
            toast.error("Kommentar konnte nicht gespeichert werden");
        }
    };

    const parkspaceTags = Object.entries(parkingSpace.tags).filter(([key]) => !EXCLUDED_TAGS.has(key));

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-start justify-between gap-3 p-5 border-b">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {parkingSpace.isHiker ? (
                            <Badge className="bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand))] gap-1">
                                <Mountain className="size-3" /> Wanderparkplatz
                            </Badge>
                        ) : (
                            <Badge variant="secondary">Parkplatz</Badge>
                        )}
                        {parkingSpace.region && (
                            <span className="text-xs text-muted-foreground">{parkingSpace.region}</span>
                        )}
                    </div>
                    <h2 className="font-heading text-xl font-semibold leading-tight">{parkingSpace.name}</h2>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="inline-flex items-center gap-1">
                            <StarIcon className="size-3.5 fill-[hsl(var(--rating))] text-[hsl(var(--rating))]" />
                            <span className="font-semibold tabular-nums">{avg > 0 ? avg.toFixed(1) : "–"}</span>
                            <span className="text-xs text-muted-foreground">
                                ({reviews.length || parkingSpace.reviewCount})
                            </span>
                        </span>
                        {dist != null && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Navigation className="size-3.5" />
                                {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                            </span>
                        )}
                    </div>
                </div>
                {!inSheet && (
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onClose}
                        aria-label="Schließen">
                        <X />
                    </Button>
                )}
            </div>

            <Tabs
                defaultValue="info"
                className="flex-1 flex flex-col min-h-0">
                <TabsList className="m-4 mb-0 grid grid-cols-3">
                    <TabsTrigger value="info">Übersicht</TabsTrigger>
                    <TabsTrigger value="reviews">
                        Bewertungen
                        {reviews.length > 0 && <span className="ml-1 text-xs opacity-70">{reviews.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="comments">
                        Kommentare
                        {comments.length > 0 && <span className="ml-1 text-xs opacity-70">{comments.length}</span>}
                    </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1">
                    <TabsContent
                        value="info"
                        className="p-5 space-y-4 mt-0">
                        <div className="rounded-xl border bg-card p-4">
                            <div className="text-xs text-muted-foreground">Koordinaten</div>
                            <div className="font-mono text-sm mt-1">
                                {parkingSpace.lat.toFixed(5)}, {parkingSpace.lng.toFixed(5)}
                            </div>
                            <a
                                href={`https://www.openstreetmap.org/?mlat=${parkingSpace.lat}&mlon=${parkingSpace.lng}#map=17/${parkingSpace.lat}/${parkingSpace.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[hsl(var(--brand))] hover:underline mt-2 inline-block">
                                Auf OpenStreetMap öffnen →
                            </a>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Stat
                                label="Bewertungen"
                                value={reviews.length || parkingSpace.reviewCount}
                            />
                            <Stat
                                label="Kommentare"
                                value={comments.length || parkingSpace.commentCount}
                            />
                        </div>
                        {parkspaceTags.length > 0 && (
                            <div className="rounded-xl border bg-card p-3 min-w-0 overflow-hidden">
                                <div className="text-xs text-muted-foreground mb-2">Tags</div>

                                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto overflow-x-hidden pr-1 min-w-0">
                                    {parkspaceTags.map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="flex items-start gap-3 text-xs min-w-0 w-full">
                                            <span className="text-muted-foreground truncate min-w-0 flex-1">{key}</span>
                                            <span className="font-medium min-w-0 flex-1 text-right break-all">
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent
                        value="reviews"
                        className="p-5 space-y-3 mt-0">
                        {reviewsQ.isLoading && <Skeleton lines={3} />}
                        {!reviewsQ.isLoading && reviews.length === 0 && (
                            <Empty text="Noch keine Bewertungen. Sei die erste Person!" />
                        )}
                        {reviews.map((r) => (
                            <div
                                key={r.id}
                                className="rounded-xl border bg-card p-3">
                                <div className="flex justify-between items-center mb-1">
                                    <StarRating
                                        value={r.stars}
                                        readOnly
                                        size={14}
                                    />
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-semibold text-muted-foreground">
                                            {r.user?.username}
                                        </span>
                                        {(isStaff || isAdmin || r.user?.id === currentUser?.id) && (
                                            <button
                                                className="text-destructive hover:text-destructive/80"
                                                onClick={() => handleDeleteClick("review", r.id)}
                                                title="Bewertung löschen">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {r.reviewText && <p className="text-sm mt-1.5 text-foreground/90">{r.reviewText}</p>}
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent
                        value="comments"
                        className="p-5 space-y-3 mt-0">
                        {commentsQ.isLoading && <Skeleton lines={3} />}
                        {!commentsQ.isLoading && comments.length === 0 && <Empty text="Noch keine Kommentare." />}
                        {comments.map((k) => (
                            <div
                                key={k.id}
                                className="rounded-xl border bg-card p-3">
                                <div className="flex items-baseline justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <User
                                            size={16}
                                            className="text-muted-foreground"
                                        />
                                        <span className="text-sm font-semibold">{k.user?.username}</span>
                                        {(isStaff || isAdmin || k.user?.id === currentUser?.id) && (
                                            <button
                                                className="text-destructive hover:text-destructive/80"
                                                onClick={() => handleDeleteClick("comment", k.id)}
                                                title="Kommentar löschen">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                                        <span className="tabular-nums">{k.score} Votes</span>
                                        <button
                                            className={
                                                "text-muted-foreground hover:scale-105 " +
                                                (k.voteStatus === "UPVOTED" ? "text-green-500!" : "")
                                            }
                                            onClick={() => {
                                                if (k.voteStatus === "UPVOTED") {
                                                    deleteUpvoteComment.mutateAsync(k.id);
                                                } else {
                                                    upvoteComment.mutateAsync(k.id);
                                                }
                                            }}>
                                            <ThumbsUp size={16} />
                                        </button>
                                        <button
                                            className={
                                                "text-muted-foreground hover:scale-105 ml-1 " +
                                                (k.voteStatus === "DOWNVOTED" ? "text-red-500!" : "")
                                            }
                                            onClick={() => {
                                                if (k.voteStatus === "DOWNVOTED") {
                                                    deleteDownvoteComment.mutateAsync(k.id);
                                                } else {
                                                    downvoteComment.mutateAsync(k.id);
                                                }
                                            }}>
                                            <ThumbsDown size={16} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm mt-1 text-foreground/90">{k.commentText}</p>
                            </div>
                        ))}
                    </TabsContent>
                </ScrollArea>
            </Tabs>

            <div className="p-3 border-t bg-background/95 backdrop-blur grid grid-cols-2 gap-2">
                <Button
                    variant="outline"
                    onClick={() => requireLogin() && setRatingOpen(true)}>
                    <StarIcon /> Bewerten
                </Button>
                <Button onClick={() => requireLogin() && setCommentOpen(true)}>
                    <MessageSquarePlus /> Kommentieren
                </Button>
            </div>

            {/* Rating dialog */}
            <Dialog
                open={ratingOpen}
                onOpenChange={setRatingOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Parkplatz bewerten</DialogTitle>
                        <DialogDescription>Wie ist {parkingSpace.name}?</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-4">
                        <StarRating
                            value={myRating}
                            onChange={setMyRating}
                            size={40}
                        />
                    </div>
                    <Textarea
                        placeholder="Deine Meinung..."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        maxLength={300}
                        className="mt-2"
                    />
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setRatingOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button
                            disabled={myRating === 0 || createReview.isPending}
                            onClick={submitReview}>
                            Bewertung abgeben
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Comment dialog */}
            <Dialog
                open={commentOpen}
                onOpenChange={setCommentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Kommentar schreiben</DialogTitle>
                        <DialogDescription>Teile deine Erfahrung mit anderen Wandernden.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Dein Kommentar…"
                        value={comment}
                        maxLength={MAX_LEN}
                        onChange={(e) => setComment(e.target.value)}
                        rows={5}
                    />
                    <div className="flex justify-between text-xs">
                        <span
                            className={
                                comment.trim().length < 3 && comment.length > 0
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                            }>
                            {comment.trim().length < 3 && comment.length > 0 ? "Mindestens 3 Zeichen" : "\u00A0"}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                            {comment.length} / {MAX_LEN}
                        </span>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setCommentOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button
                            disabled={comment.trim().length < 3 || createComment.isPending}
                            onClick={submitComment}>
                            Absenden
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Löschen bestätigen</DialogTitle>
                        <DialogDescription>
                            Möchtest du diese {deleteTarget?.type === "review" ? "Bewertung" : "Kommentar"} wirklich
                            löschen?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteModalOpen(false)}>
                            Abbrechen
                        </Button>
                        <Button onClick={confirmDelete}>Löschen</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border bg-card p-3">
            <div className="text-2xl font-semibold tabular-nums font-heading">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
        </div>
    );
}

function Empty({ text }: { text: string }) {
    return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

function Skeleton({ lines }: { lines: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-16 rounded-xl bg-muted animate-pulse"
                />
            ))}
        </div>
    );
}
