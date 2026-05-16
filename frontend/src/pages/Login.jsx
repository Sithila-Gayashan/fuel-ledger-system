import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); 

    // Check if already logged in
    React.useEffect(() => {
        if (localStorage.getItem('isLoggedIn')) {
            navigate('/dashboard');
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', { username, password });
            
            // Store login state
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            navigate('/dashboard'); 
        } catch (err) {
            alert("Login Failed: " + (err.response?.data?.error || "Check your credentials"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.loginBox}>
                <h2 style={{color: '#00f2ff', marginBottom: '20px'}}>⛽ Fuel Ledger Login</h2>
                <form onSubmit={handleLogin}>
                    <input 
                        type="text" 
                        placeholder="Username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)} 
                        style={styles.input}
                        required
                        autoFocus
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} 
                        style={styles.input}
                        required
                    />
                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                    Default: admin / admin123
                </p>
            </div>
        </div>
    );
};

// Styles remain the same...
const styles = {
    container: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
    loginBox: { padding: '40px', border: '1px solid #00f2ff', borderRadius: '15px', boxShadow: '0 0 20px #00f2ff', textAlign: 'center', width: '350px', backgroundColor: '#0a0a0a' },
    input: { display: 'block', width: '100%', margin: '15px 0', padding: '12px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '5px', outline: 'none' },
    button: { width: '100%', padding: '12px', backgroundColor: '#00f2ff', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '5px', marginTop: '10px', color: '#000' }
};

export default Login;