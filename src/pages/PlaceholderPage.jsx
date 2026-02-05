const PlaceholderPage = ({ title }) => {
    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            position: 'relative'
        }}>
            <img
                src="/src/ldm-calculator-beyaz-logo.png"
                alt="LDM Logo"
                onClick={() => window.location.href = '/'}
                style={{
                    position: 'absolute',
                    top: '2rem',
                    left: '2rem',
                    width: '180px',
                    zIndex: 1000,
                    cursor: 'pointer'
                }}
            />
            <h1>{title}</h1>
            <p>Bu bölüm yakında eklenecektir.</p>
            <button
                className="ai-btn"
                onClick={() => window.history.back()}
                style={{ marginTop: '20px' }}
            >
                <div className="ai-btn-inner">Geri Dön</div>
            </button>
        </div>
    );
};

export default PlaceholderPage;
