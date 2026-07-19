const fs = require('fs');

const generateSection = (title, singular, id, icon) => {
  return `
        {/* ${title} Filter Section */}
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: is${id}Collapsed ? 0 : 10 
          }}>
            <div 
              onClick={() => setIs${id}Collapsed(prev => !prev)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: is${id}Collapsed ? 'none' : '1px solid var(--border)', 
                paddingBottom: is${id}Collapsed ? '0' : '6px',
                marginBottom: is${id}Collapsed ? '0' : '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                <span style={{ fontSize: '13px' }}>${icon}</span>
                <span style={{ fontSize: '12.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>${title}</span>
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{is${id}Collapsed ? '▼' : '▲'}</span>
            </div>
            
            {!is${id}Collapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* From ${singular} */}
                <div 
                  ref={from${id}Ref} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>From ${singular}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search from..."
                      value={from${id}Search}
                      onChange={(e) => {
                        setFrom${id}Search(e.target.value);
                        setIsFrom${id}Open(true);
                        if (!e.target.value) {
                          setSelectedFrom${id}('');
                        }
                      }}
                      onFocus={() => setIsFrom${id}Open(true)}
                      style={{
                        width: '100%',
                        padding: '10px 32px 10px 14px',
                        background: 'var(--soft)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                    />
                    {from${id}Search && (
                      <button
                        title="Clear ${singular}"
                        onClick={() => {
                          setFrom${id}Search('');
                          setSelectedFrom${id}('');
                        }}
                        style={{
                          position: 'absolute',
                          right: '26px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    )}
                    <span
                      onClick={() => setIsFrom${id}Open(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isFrom${id}Open ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isFrom${id}Open && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 9999,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                      marginTop: '4px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      padding: '6px'
                    }}>
                      {filteredFrom${id}s.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No ${title.toLowerCase()} match
                        </div>
                      ) : (
                        filteredFrom${id}s.filter(Boolean).map(item => {
                          const isCurrent = String(item.${id}ID) === String(selectedFrom${id});
                          return (
                            <div
                              key={item.${id}ID}
                              onClick={() => {
                                setSelectedFrom${id}(item.${id}ID);
                                setFrom${id}Search(\`\${item.${id}ID} - \${item.${id}Name}\`);
                                setIsFrom${id}Open(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: isCurrent ? 'var(--orange-glow)' : 'transparent',
                                color: isCurrent ? 'var(--orange2)' : 'var(--text)',
                                fontSize: '12.5px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'background 0.1s ease',
                                marginBottom: '2px'
                              }}
                              onMouseEnter={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = 'var(--soft)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <span style={{ fontWeight: isCurrent ? 700 : 500 }}>
                                {item.${id}ID} - {item.${id}Name}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* To ${singular} */}
                <div 
                  ref={to${id}Ref} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>To ${singular}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search to..."
                      value={to${id}Search}
                      onChange={(e) => {
                        setTo${id}Search(e.target.value);
                        setIsTo${id}Open(true);
                        if (!e.target.value) {
                          setSelectedTo${id}('');
                        }
                      }}
                      onFocus={() => setIsTo${id}Open(true)}
                      style={{
                        width: '100%',
                        padding: '10px 32px 10px 14px',
                        background: 'var(--soft)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        color: 'var(--text)',
                        fontSize: '13px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                    />
                    {to${id}Search && (
                      <button
                        title="Clear ${singular}"
                        onClick={() => {
                          setTo${id}Search('');
                          setSelectedTo${id}('');
                        }}
                        style={{
                          position: 'absolute',
                          right: '26px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    )}
                    <span
                      onClick={() => setIsTo${id}Open(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isTo${id}Open ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isTo${id}Open && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 9999,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                      marginTop: '4px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      padding: '6px'
                    }}>
                      {filteredTo${id}s.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No ${title.toLowerCase()} match
                        </div>
                      ) : (
                        filteredTo${id}s.filter(Boolean).map(item => {
                          const isCurrent = String(item.${id}ID) === String(selectedTo${id});
                          return (
                            <div
                              key={item.${id}ID}
                              onClick={() => {
                                setSelectedTo${id}(item.${id}ID);
                                setTo${id}Search(\`\${item.${id}ID} - \${item.${id}Name}\`);
                                setIsTo${id}Open(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: isCurrent ? 'var(--orange-glow)' : 'transparent',
                                color: isCurrent ? 'var(--orange2)' : 'var(--text)',
                                fontSize: '12.5px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'background 0.1s ease',
                                marginBottom: '2px'
                              }}
                              onMouseEnter={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = 'var(--soft)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isCurrent) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <span style={{ fontWeight: isCurrent ? 700 : 500 }}>
                                {item.${id}ID} - {item.${id}Name}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
`;
};

const assetHTML = generateSection('Asset', 'Asset', 'Asset', '📦');
const employeeHTML = generateSection('Employee', 'Employee', 'Employee', '👥');
const expenseHTML = generateSection('Expenses', 'Expense', 'Expense', '💸');

fs.writeFileSync('new_filters.jsx', assetHTML + employeeHTML + expenseHTML);
