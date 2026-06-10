import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, springLogin } from "@/lib/api";
import { useRegister } from "@/lib/hooks";
import { toast } from "sonner";
import type { UserDto } from "@/lib/types";

type Props = {
    open: boolean;
    onOpenChange: (b: boolean) => void;
    onAuth: (profile: UserDto) => void;
};

export function AuthDialog({ open, onOpenChange, onAuth }: Props) {
    const [loginUser, setLoginUser] = useState("");
    const [loginPw, setLoginPw] = useState("");
    const [regUser, setRegUser] = useState("");
    const [regPw, setRegPw] = useState("");
    const [regPw2, setRegPw2] = useState("");
    const [loginBusy, setLoginBusy] = useState(false);
    const register = useRegister();

    const pwValid = regPw.length >= 8;
    const pwMatch = regPw === regPw2;
    const regValid = regUser.length >= 3 && pwValid && pwMatch;

    const handleLogin = async () => {
        setLoginBusy(true);
        try {
            await springLogin(loginUser, loginPw);

            try {
                const profile = await api.getCurrentUser();
                onAuth(profile);
                onOpenChange(false);
            } catch {
                // fallback: minimal data
                const minimalProfile: UserDto = { id: 0, username: loginUser };
                onAuth(minimalProfile);
                onOpenChange(false);
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Login fehlgeschlagen");
        } finally {
            setLoginBusy(false);
        }
    };

    const handleRegister = async () => {
        try {
            await register.mutateAsync({ username: regUser, password: regPw });
            toast.success("Konto erstellt");
            const newProfile: UserDto = { id: 0, username: regUser };
            onAuth(newProfile);
            onOpenChange(false);
        } catch {
            toast.error("Registrierung fehlgeschlagen");
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-heading">Willkommen bei Wanderpark</DialogTitle>
                    <DialogDescription>
                        Logge dich ein oder erstelle ein Konto, um zu bewerten und zu kommentieren.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="login">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Login</TabsTrigger>
                        <TabsTrigger value="register">Registrieren</TabsTrigger>
                    </TabsList>
                    <TabsContent
                        value="login"
                        className="space-y-3 mt-4">
                        <Field
                            id="lu"
                            label="Username"
                            value={loginUser}
                            onChange={setLoginUser}
                        />
                        <Field
                            id="lp"
                            label="Passwort"
                            type="password"
                            value={loginPw}
                            onChange={setLoginPw}
                        />
                        <Button
                            className="w-full h-11"
                            disabled={!loginUser || !loginPw || loginBusy}
                            onClick={handleLogin}>
                            {loginBusy ? "Prüfe…" : "Einloggen"}
                        </Button>
                    </TabsContent>
                    <TabsContent
                        value="register"
                        className="space-y-3 mt-4">
                        <Field
                            id="ru"
                            label="Username"
                            value={regUser}
                            onChange={setRegUser}
                            error={regUser.length > 0 && regUser.length < 3 ? "Mindestens 3 Zeichen" : null}
                        />
                        <Field
                            id="rp"
                            label="Passwort"
                            type="password"
                            value={regPw}
                            onChange={setRegPw}
                            error={regPw.length > 0 && !pwValid ? "Mindestens 8 Zeichen" : null}
                        />
                        <Field
                            id="rp2"
                            label="Passwort wiederholen"
                            type="password"
                            value={regPw2}
                            onChange={setRegPw2}
                            error={regPw2.length > 0 && !pwMatch ? "Passwörter stimmen nicht überein" : null}
                        />
                        <Button
                            className="w-full h-11"
                            disabled={!regValid || register.isPending}
                            onClick={handleRegister}>
                            {register.isPending ? "Erstelle…" : "Konto erstellen"}
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

function Field({
    id,
    label,
    value,
    onChange,
    type = "text",
    error,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    error?: string | null;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-11"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
