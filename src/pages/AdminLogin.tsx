import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const auth = getAuth();
            await signInWithEmailAndPassword(auth, email, password);
            // Success! Send them to the host dashboard
            navigate('/host');
        } catch (err: any) {
            setError('Invalid email or password.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md p-8 bg-card border border-border rounded-2xl shadow-xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">GrandMaster Admin</h1>
                    <p className="text-muted-foreground text-sm">Sign in to manage question packs</p>
                </div>

                {error && (
                    <div className="p-3 mb-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary"
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full py-6 font-bold text-lg" disabled={loading}>
                        {loading ? 'Verifying...' : 'Login'}
                    </Button>
                </form>
            </div>
        </div>
    );
}