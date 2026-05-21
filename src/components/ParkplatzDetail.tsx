import { useState } from "react";
import { MessageSquarePlus, Mountain, Navigation, Star as StarIcon, X } from "lucide-react";
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
import { distanzKm, type LatLng, type Parkplatz } from "@/lib/types";
import { useCreateComment, useCreateReview, useSpaceComments, useSpaceReviews } from "@/lib/hooks";
import { toast } from "sonner";

type Props = {
    parkplatz: Parkplatz;
    userPos: LatLng | null;
    onClose: () => void;
    canInteract: boolean;
    onRequireLogin: () => void;
    inSheet?: boolean;
};

const MAX_LEN = 300;

export function ParkplatzDetail({ parkplatz, userPos, onClose, canInteract, onRequireLogin, inSheet }: Props) {
    const [ratingOpen, setRatingOpen] = useState(false);
    const [commentOpen, setCommentOpen] = useState(false);
    const [myRating, setMyRating] = useState(0);
    const [comment, setComment] = useState("");

    const reviewsQ = useSpaceReviews(parkplatz.osmId);
    const commentsQ = useSpaceComments(parkplatz.osmId);
    const createReview = useCreateReview();
    const createComment = useCreateComment();

    const dist = userPos ? distanzKm(userPos, parkplatz) : null;

    const reviews = reviewsQ.data ?? [];
    const comments = commentsQ.data ?? [];
    const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : parkplatz.bewertung;

    const requireLogin = () => {
        if (!canInteract) {
            onRequireLogin();
            return false;
        }
        return true;
    };

    const submitReview = async () => {
        try {
            await createReview.mutateAsync({
                osmId: parkplatz.osmId,
                stars: myRating,
                reviewText: "",
            });
            toast.success("Bewertung gespeichert");
            setRatingOpen(false);
            setMyRating(0);
        } catch {
            toast.error("Bewertung konnte nicht gespeichert werden");
        }
    };

    const submitComment = async () => {
        try {
            await createComment.mutateAsync({
                osmId: parkplatz.osmId,
                commentText: comment,
            });
            toast.success("Kommentar gespeichert");
            setCommentOpen(false);
            setComment("");
        } catch {
            toast.error("Kommentar konnte nicht gespeichert werden");
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-start justify-between gap-3 p-5 border-b">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {parkplatz.istWanderparkplatz ? (
                            <Badge className="bg-[hsl(var(--brand))] text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand))] gap-1">
                                <Mountain className="size-3" /> Wanderparkplatz
                            </Badge>
                        ) : (
                            <Badge variant="secondary">Parkplatz</Badge>
                        )}
                        {parkplatz.region && <span className="text-xs text-muted-foreground">{parkplatz.region}</span>}
                    </div>
                    <h2 className="font-heading text-xl font-semibold leading-tight">{parkplatz.name}</h2>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="inline-flex items-center gap-1">
                            <StarIcon className="size-3.5 fill-[hsl(var(--rating))] text-[hsl(var(--rating))]" />
                            <span className="font-semibold tabular-nums">{avg > 0 ? avg.toFixed(1) : "–"}</span>
                            <span className="text-xs text-muted-foreground">
                                ({reviews.length || parkplatz.anzahlBewertungen})
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
                                {parkplatz.lat.toFixed(5)}, {parkplatz.lng.toFixed(5)}
                            </div>
                            <a
                                href={`https://www.openstreetmap.org/?mlat=${parkplatz.lat}&mlon=${parkplatz.lng}#map=17/${parkplatz.lat}/${parkplatz.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[hsl(var(--brand))] hover:underline mt-2 inline-block">
                                Auf OpenStreetMap öffnen →
                            </a>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Stat
                                label="Bewertungen"
                                value={reviews.length || parkplatz.anzahlBewertungen}
                            />
                            <Stat
                                label="Kommentare"
                                value={comments.length || parkplatz.anzahlKommentare}
                            />
                        </div>
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
                                <StarRating
                                    value={r.stars}
                                    readOnly
                                    size={14}
                                />
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
                                    <span className="text-sm font-semibold">{k.username}</span>
                                    <span className="text-xs text-muted-foreground tabular-nums">{k.score} Pkt</span>
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
                        <DialogDescription>Wie ist {parkplatz.name}?</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center py-4">
                        <StarRating
                            value={myRating}
                            onChange={setMyRating}
                            size={40}
                        />
                    </div>
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
