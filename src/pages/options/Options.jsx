/**
 * Options.jsx — API Key settings page
 * 
 * Provides a single input field for the Claude API key,
 * stored in localStorage. No accounts, no login.
 * 
 * Placeholder for now. Full build in PART 8.
 */

function Options() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Lora', serif",
            color: 'var(--text)',
        }}>
            <h1 style={{ fontSize: '1.5rem' }}>WordLens — Settings</h1>
        </div>
    )
}

export default Options
