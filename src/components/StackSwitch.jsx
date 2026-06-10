// Stylized sliding toggle for the "stackable / non-stackable" choice.
//   ON  (right, green) = stackable      → /duzenlenebilir.svg
//   OFF (left,  rose)  = non-stackable  → /duzenlenemez.svg
// State-driven inline styles (no Tailwind / no CSS :checked needed).
const StackSwitch = ({ on, onChange, title }) => (
    <button
        type="button"
        role="switch"
        aria-checked={on}
        title={title}
        onClick={() => onChange(!on)}
        style={{
            position: 'relative',
            width: 60,
            height: 30,
            flexShrink: 0,
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            borderRadius: 999,
            background: on ? '#10b981' : '#fb7185',
            transition: 'background 0.3s',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.25)',
        }}
    >
        <span
            style={{
                position: 'absolute',
                top: 3,
                left: on ? 33 : 3,
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#f9fafb',
                transition: 'left 0.3s, transform 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
            }}
        >
            <img
                src={on ? '/duzenlenebilir.svg' : '/duzenlenemez.svg'}
                alt=""
                aria-hidden="true"
                style={{ width: 15, height: 15 }}
            />
        </span>
    </button>
);

export default StackSwitch;
