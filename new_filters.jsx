
        {/* Asset Filter Section */}
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isAssetCollapsed ? 0 : 10 
          }}>
            <div 
              onClick={() => setIsAssetCollapsed(prev => !prev)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: isAssetCollapsed ? 'none' : '1px solid var(--border)', 
                paddingBottom: isAssetCollapsed ? '0' : '6px',
                marginBottom: isAssetCollapsed ? '0' : '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                <span style={{ fontSize: '13px' }}>📦</span>
                <span style={{ fontSize: '12.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asset</span>
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{isAssetCollapsed ? '▼' : '▲'}</span>
            </div>
            
            {!isAssetCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* From Asset */}
                <div 
                  ref={fromAssetRef} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>From Asset</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search from..."
                      value={fromAssetSearch}
                      onChange={(e) => {
                        setFromAssetSearch(e.target.value);
                        setIsFromAssetOpen(true);
                        if (!e.target.value) {
                          setSelectedFromAsset('');
                        }
                      }}
                      onFocus={() => setIsFromAssetOpen(true)}
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
                    {fromAssetSearch && (
                      <button
                        title="Clear Asset"
                        onClick={() => {
                          setFromAssetSearch('');
                          setSelectedFromAsset('');
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
                      onClick={() => setIsFromAssetOpen(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isFromAssetOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isFromAssetOpen && (
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
                      {filteredFromAssets.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No asset match
                        </div>
                      ) : (
                        filteredFromAssets.filter(Boolean).map(item => {
                          const isCurrent = String(item.AssetID) === String(selectedFromAsset);
                          return (
                            <div
                              key={item.AssetID}
                              onClick={() => {
                                setSelectedFromAsset(item.AssetID);
                                setFromAssetSearch(`${item.AssetID} - ${item.AssetName}`);
                                setIsFromAssetOpen(false);
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
                                {item.AssetID} - {item.AssetName}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* To Asset */}
                <div 
                  ref={toAssetRef} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>To Asset</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search to..."
                      value={toAssetSearch}
                      onChange={(e) => {
                        setToAssetSearch(e.target.value);
                        setIsToAssetOpen(true);
                        if (!e.target.value) {
                          setSelectedToAsset('');
                        }
                      }}
                      onFocus={() => setIsToAssetOpen(true)}
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
                    {toAssetSearch && (
                      <button
                        title="Clear Asset"
                        onClick={() => {
                          setToAssetSearch('');
                          setSelectedToAsset('');
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
                      onClick={() => setIsToAssetOpen(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isToAssetOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isToAssetOpen && (
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
                      {filteredToAssets.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No asset match
                        </div>
                      ) : (
                        filteredToAssets.filter(Boolean).map(item => {
                          const isCurrent = String(item.AssetID) === String(selectedToAsset);
                          return (
                            <div
                              key={item.AssetID}
                              onClick={() => {
                                setSelectedToAsset(item.AssetID);
                                setToAssetSearch(`${item.AssetID} - ${item.AssetName}`);
                                setIsToAssetOpen(false);
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
                                {item.AssetID} - {item.AssetName}
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

        {/* Employee Filter Section */}
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isEmployeeCollapsed ? 0 : 10 
          }}>
            <div 
              onClick={() => setIsEmployeeCollapsed(prev => !prev)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: isEmployeeCollapsed ? 'none' : '1px solid var(--border)', 
                paddingBottom: isEmployeeCollapsed ? '0' : '6px',
                marginBottom: isEmployeeCollapsed ? '0' : '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                <span style={{ fontSize: '13px' }}>👥</span>
                <span style={{ fontSize: '12.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee</span>
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{isEmployeeCollapsed ? '▼' : '▲'}</span>
            </div>
            
            {!isEmployeeCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* From Employee */}
                <div 
                  ref={fromEmployeeRef} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>From Employee</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search from..."
                      value={fromEmployeeSearch}
                      onChange={(e) => {
                        setFromEmployeeSearch(e.target.value);
                        setIsFromEmployeeOpen(true);
                        if (!e.target.value) {
                          setSelectedFromEmployee('');
                        }
                      }}
                      onFocus={() => setIsFromEmployeeOpen(true)}
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
                    {fromEmployeeSearch && (
                      <button
                        title="Clear Employee"
                        onClick={() => {
                          setFromEmployeeSearch('');
                          setSelectedFromEmployee('');
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
                      onClick={() => setIsFromEmployeeOpen(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isFromEmployeeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isFromEmployeeOpen && (
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
                      {filteredFromEmployees.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No employee match
                        </div>
                      ) : (
                        filteredFromEmployees.filter(Boolean).map(item => {
                          const isCurrent = String(item.EmployeeID) === String(selectedFromEmployee);
                          return (
                            <div
                              key={item.EmployeeID}
                              onClick={() => {
                                setSelectedFromEmployee(item.EmployeeID);
                                setFromEmployeeSearch(`${item.EmployeeID} - ${item.EmployeeName}`);
                                setIsFromEmployeeOpen(false);
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
                                {item.EmployeeID} - {item.EmployeeName}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* To Employee */}
                <div 
                  ref={toEmployeeRef} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>To Employee</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search to..."
                      value={toEmployeeSearch}
                      onChange={(e) => {
                        setToEmployeeSearch(e.target.value);
                        setIsToEmployeeOpen(true);
                        if (!e.target.value) {
                          setSelectedToEmployee('');
                        }
                      }}
                      onFocus={() => setIsToEmployeeOpen(true)}
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
                    {toEmployeeSearch && (
                      <button
                        title="Clear Employee"
                        onClick={() => {
                          setToEmployeeSearch('');
                          setSelectedToEmployee('');
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
                      onClick={() => setIsToEmployeeOpen(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isToEmployeeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isToEmployeeOpen && (
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
                      {filteredToEmployees.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No employee match
                        </div>
                      ) : (
                        filteredToEmployees.filter(Boolean).map(item => {
                          const isCurrent = String(item.EmployeeID) === String(selectedToEmployee);
                          return (
                            <div
                              key={item.EmployeeID}
                              onClick={() => {
                                setSelectedToEmployee(item.EmployeeID);
                                setToEmployeeSearch(`${item.EmployeeID} - ${item.EmployeeName}`);
                                setIsToEmployeeOpen(false);
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
                                {item.EmployeeID} - {item.EmployeeName}
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

        {/* Expenses Filter Section */}
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isExpenseCollapsed ? 0 : 10 
          }}>
            <div 
              onClick={() => setIsExpenseCollapsed(prev => !prev)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: isExpenseCollapsed ? 'none' : '1px solid var(--border)', 
                paddingBottom: isExpenseCollapsed ? '0' : '6px',
                marginBottom: isExpenseCollapsed ? '0' : '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                <span style={{ fontSize: '13px' }}>💸</span>
                <span style={{ fontSize: '12.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expenses</span>
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{isExpenseCollapsed ? '▼' : '▲'}</span>
            </div>
            
            {!isExpenseCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* From Expense */}
                <div 
                  ref={fromExpenseRef} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>From Expense</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search from..."
                      value={fromExpenseSearch}
                      onChange={(e) => {
                        setFromExpenseSearch(e.target.value);
                        setIsFromExpenseOpen(true);
                        if (!e.target.value) {
                          setSelectedFromExpense('');
                        }
                      }}
                      onFocus={() => setIsFromExpenseOpen(true)}
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
                    {fromExpenseSearch && (
                      <button
                        title="Clear Expense"
                        onClick={() => {
                          setFromExpenseSearch('');
                          setSelectedFromExpense('');
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
                      onClick={() => setIsFromExpenseOpen(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isFromExpenseOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isFromExpenseOpen && (
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
                      {filteredFromExpenses.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No expenses match
                        </div>
                      ) : (
                        filteredFromExpenses.filter(Boolean).map(item => {
                          const isCurrent = String(item.ExpenseID) === String(selectedFromExpense);
                          return (
                            <div
                              key={item.ExpenseID}
                              onClick={() => {
                                setSelectedFromExpense(item.ExpenseID);
                                setFromExpenseSearch(`${item.ExpenseID} - ${item.ExpenseName}`);
                                setIsFromExpenseOpen(false);
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
                                {item.ExpenseID} - {item.ExpenseName}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* To Expense */}
                <div 
                  ref={toExpenseRef} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>To Expense</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search to..."
                      value={toExpenseSearch}
                      onChange={(e) => {
                        setToExpenseSearch(e.target.value);
                        setIsToExpenseOpen(true);
                        if (!e.target.value) {
                          setSelectedToExpense('');
                        }
                      }}
                      onFocus={() => setIsToExpenseOpen(true)}
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
                    {toExpenseSearch && (
                      <button
                        title="Clear Expense"
                        onClick={() => {
                          setToExpenseSearch('');
                          setSelectedToExpense('');
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
                      onClick={() => setIsToExpenseOpen(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isToExpenseOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isToExpenseOpen && (
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
                      {filteredToExpenses.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No expenses match
                        </div>
                      ) : (
                        filteredToExpenses.filter(Boolean).map(item => {
                          const isCurrent = String(item.ExpenseID) === String(selectedToExpense);
                          return (
                            <div
                              key={item.ExpenseID}
                              onClick={() => {
                                setSelectedToExpense(item.ExpenseID);
                                setToExpenseSearch(`${item.ExpenseID} - ${item.ExpenseName}`);
                                setIsToExpenseOpen(false);
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
                                {item.ExpenseID} - {item.ExpenseName}
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
