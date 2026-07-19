  return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [
    accounts, selectedAccountNum, 
    customers, selectedFromCust, selectedToCust, 
    vendors, selectedFromVendor, selectedToVendor, 
    banks, selectedFromBank, selectedToBank,
    assets, selectedFromAsset, selectedToAsset,
    employees, selectedFromEmployee, selectedToEmployee,
    expenses, selectedFromExpense, selectedToExpense
  ]);


  // Selected details objects
  const selectedAccount = useMemo(() => {
    return Array.isArray(accounts) ? accounts.find(a => a && a.AccountNumber === selectedAccountNum) || null : null;
  }, [accounts, selectedAccountNum]);

  // Helper function to filter customer list dynamically
  const filterCustomerList = (txt, selectedCode) => {
    if (!Array.isArray(customers)) return [];
    if (!txt) return customers;
    const selectedObj = customers.find(c => c && String(c.CustomerNo) === String(selectedCode));
    if (selectedObj && txt === `${selectedObj.CustomerNo} - ${selectedObj.CustomerName}`) {
      return customers;
    }
    const term = txt.toLowerCase();
    return customers.filter(cust => 
      cust && (
        String(cust.CustomerNo || '').toLowerCase().includes(term) ||
        String(cust.CustomerName || '').toLowerCase().includes(term)
      )
    );
  };

  // Helper function to filter vendor list dynamically
  const filterVendorList = (txt, selectedCode) => {
    if (!Array.isArray(vendors)) return [];
    if (!txt) return vendors;
    const selectedObj = vendors.find(v => v && String(v.VendorNumber) === String(selectedCode));
    if (selectedObj && txt === `${selectedObj.VendorNumber} - ${selectedObj.VendorName}`) {
      return vendors;
    }
    const term = txt.toLowerCase();
    return vendors.filter(v => 
      v && (
        String(v.VendorNumber || '').toLowerCase().includes(term) ||
        String(v.VendorName || '').toLowerCase().includes(term)
      )
    );
  };

  // Helper function to filter bank list dynamically
  const filterBankList = (txt, selectedCode) => {
    if (!Array.isArray(banks)) return [];
    if (!txt) return banks;
    const selectedObj = banks.find(b => b && String(b.BankAccountNumber) === String(selectedCode));
    if (selectedObj && txt === `${selectedObj.BankAccountNumber} - ${selectedObj.BankAccountName}`) {
      return banks;
    }
    const term = txt.toLowerCase();
    return banks.filter(b => 
      b && (
        String(b.BankAccountNumber || '').toLowerCase().includes(term) ||
        String(b.BankAccountName || '').toLowerCase().includes(term)
      )
    );
  };

  // Helper function to filter asset list dynamically
  const filterAssetList = (txt, selectedCode) => {
    if (!Array.isArray(assets)) return [];
    if (!txt) return assets;
    const selectedObj = assets.find(a => a && String(a.AssetID) === String(selectedCode));
    if (selectedObj && txt === `${selectedObj.AssetID} - ${selectedObj.AssetName}`) {
      return assets;
    }
    const term = txt.toLowerCase();
    return assets.filter(a => 
      a && (
        String(a.AssetID || '').toLowerCase().includes(term) ||
        String(a.AssetName || '').toLowerCase().includes(term)
      )
    );
  };

  // Helper function to filter employee list dynamically
  const filterEmployeeList = (txt, selectedCode) => {
    if (!Array.isArray(employees)) return [];
    if (!txt) return employees;
    const selectedObj = employees.find(e => e && String(e.EmployeeID) === String(selectedCode));
    if (selectedObj && txt === `${selectedObj.EmployeeID} - ${selectedObj.EmployeeName}`) {
      return employees;
    }
    const term = txt.toLowerCase();
    return employees.filter(e => 
      e && (
        String(e.EmployeeID || '').toLowerCase().includes(term) ||
        String(e.EmployeeName || '').toLowerCase().includes(term)
      )
    );
  };

  // Helper function to filter expense list dynamically
  const filterExpenseList = (txt, selectedCode) => {
    if (!Array.isArray(expenses)) return [];
    if (!txt) return expenses;
    const selectedObj = expenses.find(e => e && String(e.ExpenseID) === String(selectedCode));
    if (selectedObj && txt === `${selectedObj.ExpenseID} - ${selectedObj.ExpenseName}`) {
      return expenses;
    }
    const term = txt.toLowerCase();
    return expenses.filter(e => 
      e && (
        String(e.ExpenseID || '').toLowerCase().includes(term) ||
        String(e.ExpenseName || '').toLowerCase().includes(term)
      )
    );
  };

  const filteredFromCustomers = useMemo(() => {
    return filterCustomerList(fromCustSearch, selectedFromCust);
  }, [customers, fromCustSearch, selectedFromCust]);

  const filteredToCustomers = useMemo(() => {
    return filterCustomerList(toCustSearch, selectedToCust);
  }, [customers, toCustSearch, selectedToCust]);

  const filteredFromVendors = useMemo(() => {
    return filterVendorList(fromVendorSearch, selectedFromVendor);
  }, [vendors, fromVendorSearch, selectedFromVendor]);

  const filteredToVendors = useMemo(() => {
    return filterVendorList(toVendorSearch, selectedToVendor);
  }, [vendors, toVendorSearch, selectedToVendor]);

  const filteredFromBanks = useMemo(() => {
    return filterBankList(fromBankSearch, selectedFromBank);
  }, [banks, fromBankSearch, selectedFromBank]);

  const filteredToBanks = useMemo(() => {
    return filterBankList(toBankSearch, selectedToBank);
  }, [banks, toBankSearch, selectedToBank]);

  const filteredFromAssets = useMemo(() => {
    return filterAssetList(fromAssetSearch, selectedFromAsset);
  }, [assets, fromAssetSearch, selectedFromAsset]);

  const filteredToAssets = useMemo(() => {
    return filterAssetList(toAssetSearch, selectedToAsset);
  }, [assets, toAssetSearch, selectedToAsset]);

  const filteredFromEmployees = useMemo(() => {
    return filterEmployeeList(fromEmployeeSearch, selectedFromEmployee);
  }, [employees, fromEmployeeSearch, selectedFromEmployee]);

  const filteredToEmployees = useMemo(() => {
    return filterEmployeeList(toEmployeeSearch, selectedToEmployee);
  }, [employees, toEmployeeSearch, selectedToEmployee]);

  const filteredFromExpenses = useMemo(() => {
    return filterExpenseList(fromExpenseSearch, selectedFromExpense);
  }, [expenses, fromExpenseSearch, selectedFromExpense]);

  const filteredToExpenses = useMemo(() => {
    return filterExpenseList(toExpenseSearch, selectedToExpense);
  }, [expenses, toExpenseSearch, selectedToExpense]);

  // Combined accounts list for autocomplete
  const filteredAccounts = useMemo(() => {
    if (!Array.isArray(accounts)) return [];
    if (!searchText) return accounts;
    if (selectedAccount && searchText === `${selectedAccount.AccountNumber} - ${selectedAccount.AccountDescription}`) {
      return accounts;
    }
    const term = searchText.toLowerCase();
    return accounts.filter(acc => 
      (acc.AccountNumber || '').toLowerCase().includes(term) ||
      (acc.AccountDescription || '').toLowerCase().includes(term) ||
      (acc.AccountType || '').toLowerCase().includes(term)
    );
  }, [accounts, searchText, selectedAccount]);

  // Fetch accounts list
  async function fetchAccounts() {
    setLoadingAccounts(true);
    try {
      const d = await apiCall('Accounts Master All', null, { User: user?.Username });
      if (d.State === 0) {
        setAccounts(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAccounts(false);
    }
  }

  // Fetch customers list
  async function fetchCustomers() {
    setLoadingCustomers(true);
    try {
      const d = await apiCall('Customer Master All', null, { User: user?.Username });
      if (d.State === 0) {
        setCustomers(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCustomers(false);
    }
  }

  // Fetch vendors list
  async function fetchVendors() {
    setLoadingVendors(true);
    try {
      const d = await apiCall('Vendor Master All', null, { User: user?.Username });
      if (d.State === 0) {
        setVendors(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVendors(false);
    }
  }

  // Fetch banks list
  async function fetchBanks() {
    setLoadingBanks(true);
    try {
      const d = await apiCall('Bank Accounts Master', null, { User: user?.Username });
      if (d.State === 0) {
        setBanks(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBanks(false);
    }
  }

  // Fetch assets list
  async function fetchAssets() {
    setLoadingAssets(true);
    try {
      const d = await apiCall('Asset Master All', null, { User: user?.Username });
      if (d.State === 0) {
        setAssets(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAssets(false);
    }
  }

  // Fetch employees list
  async function fetchEmployees() {
    setLoadingEmployees(true);
    try {
      const d = await apiCall('Employee Master All', null, { User: user?.Username });
      if (d.State === 0) {
        setEmployees(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEmployees(false);
    }
  }

  // Fetch expenses list
  async function fetchExpenses() {
    setLoadingExpenses(true);
    try {
      const d = await apiCall('Expense Master All', null, { User: user?.Username });
      if (d.State === 0) {
        setExpenses(d.List0 || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExpenses(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
    fetchCustomers();
    fetchVendors();
    fetchBanks();
    fetchAssets();
    fetchEmployees();
    fetchExpenses();
  }, [user]);

  // Fetch statement data
  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!selectedAccountNum) {
      setError('Please select an account first');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const d = await apiCall('Account Statement Lines', {
        param1: selectedAccountNum,
        currency: selectedCurrency,
        param2: '', // leave empty to fetch all lines up to endDate
        param3: endDate,
        fromCustomer: selectedFromCust,
        toCustomer: selectedToCust,
        fromVendor: selectedFromVendor,
        toVendor: selectedToVendor,
        fromBank: selectedFromBank,
        toBank: selectedToBank,
        fromAsset: selectedFromAsset,
        toAsset: selectedToAsset,
        fromEmployee: selectedFromEmployee,
        toEmployee: selectedToEmployee,
        fromExpense: selectedFromExpense,
        toExpense: selectedToExpense
      }, {
        User: user?.Username
      });

      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch statement records');
      } else {
        setRawData(d.List0 || []);
        setSearchFilters({
          selectedFromCust, selectedToCust,
          selectedFromVendor, selectedToVendor,
          selectedFromBank, selectedToBank,
          selectedFromAsset, selectedToAsset,
          selectedFromEmployee, selectedToEmployee,
          selectedFromExpense, selectedToExpense
        });
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  }


  // Calculate opening balance, filter, and append running balances per active grouping entity
  const statementData = useMemo(() => {
    if (!rawData.length) {
      return { 
        transactions: [], 
        entityOpenings: {}, 
        entityClosingBalances: {}, 
        summary: { openingBalance: 0, totalDebit: 0, totalCredit: 0, netChange: 0, closingBalance: 0 } 
      };
    }

    // Sort chronologically
    const sorted = [...rawData].sort((a, b) => {
      const dDiff = new Date(a.JournalDate) - new Date(b.JournalDate);
      if (dDiff !== 0) return dDiff;
      const jDiff = (a.JournalNo || '').localeCompare(b.JournalNo || '');
      if (jDiff !== 0) return jDiff;
      return (a.Line || 0) - (b.Line || 0);
    });

    const start = startDate ? new Date(startDate) : null;

    // Track running balance and opening balance per Customer/Vendor/General
    const entityBalances = {};
    const entityOpenings = {};
    const entityDebits = {};
    const entityCredits = {};

    let accountOpeningBalance = 0;
    let accountTotalDebit = 0;
    let accountTotalCredit = 0;

    const processedTransactions = [];

    sorted.forEach(row => {
      const debit = Number(row.DebitBook || 0);
      const credit = Number(row.CreditBook || 0);
      const net = debit - credit;

      const {
        selectedFromCust, selectedToCust,
        selectedFromVendor, selectedToVendor,
        selectedFromBank, selectedToBank,
        selectedFromAsset, selectedToAsset,
        selectedFromEmployee, selectedToEmployee,
        selectedFromExpense, selectedToExpense
      } = searchFilters;

      let keyParts = [];
      let codeParts = [];

      if (selectedFromCust || selectedToCust) {
        const val = row.Customer || 'General';
        const name = row.CustomerName ? ` - ${row.CustomerName}` : '';
        keyParts.push(`🏢 Customer: ${val}${name}`);
        codeParts.push(`CUST_${val}`);
      }
      if (selectedFromVendor || selectedToVendor) {
        const val = row.Vendor || 'General';
        const name = row.VendorName ? ` - ${row.VendorName}` : '';
        keyParts.push(`🏭 Vendor: ${val}${name}`);
        codeParts.push(`VEND_${val}`);
      }
      if (selectedFromBank || selectedToBank) {
        const val = row.Bank || 'General';
        keyParts.push(`🏦 Bank: ${val}`);
        codeParts.push(`BANK_${val}`);
      }
      if (selectedFromAsset || selectedToAsset) {
        const val = row.Asset || 'General';
        keyParts.push(`📦 Asset: ${val}`);
        codeParts.push(`AST_${val}`);
      }
      if (selectedFromEmployee || selectedToEmployee) {
        const val = row.Employee || 'General';
        keyParts.push(`👥 Employee: ${val}`);
        codeParts.push(`EMP_${val}`);
      }
      if (selectedFromExpense || selectedToExpense) {
        const val = row.Expense || 'General';
        keyParts.push(`💸 Expense: ${val}`);
        codeParts.push(`EXP_${val}`);
      }

      if (keyParts.length === 0) {
        keyParts.push('General / Uncategorized');
        codeParts.push('General');
      }

      const entKey = codeParts.join('|');
      const sectionKey = keyParts.join(' | ');

      if (entityBalances[entKey] === undefined) {
        entityBalances[entKey] = 0;
        entityOpenings[entKey] = 0;
        entityDebits[entKey] = 0;
        entityCredits[entKey] = 0;
      }

      entityBalances[entKey] += net;

      const isBeforeStart = start && new Date(row.JournalDate) < start;

      if (isBeforeStart) {
        entityOpenings[entKey] += net;
        accountOpeningBalance += net;
      } else {
        accountTotalDebit += debit;
        accountTotalCredit += credit;
        entityDebits[entKey] += debit;
        entityCredits[entKey] += credit;
        processedTransactions.push({
          ...row,
          runningBalance: entityBalances[entKey],
          entKey,
          sectionKey
        });
      }
    });

    // Apply inline text search filtering if user types in search feed filter
    const finalTransactions = processedTransactions.filter(tx => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (tx.LineDescription || '').toLowerCase().includes(term) ||
             (tx.Reference1 || '').toLowerCase().includes(term) ||
             (tx.Reference2 || '').toLowerCase().includes(term) ||
             (tx.JournalNo || '').toLowerCase().includes(term) ||
             (tx.EventNo || '').toString().includes(term);
    });

    return {
      transactions: finalTransactions,
      entityOpenings,
      entityDebits,
      entityCredits,
      entityClosingBalances: entityBalances,
      summary: {
        openingBalance: accountOpeningBalance,
        totalDebit: accountTotalDebit,
        totalCredit: accountTotalCredit,
        netChange: accountTotalDebit - accountTotalCredit,
        closingBalance: accountOpeningBalance + accountTotalDebit - accountTotalCredit
      }
    };
  }, [rawData, startDate, endDate, searchTerm, searchFilters]);

  // Group statement rows dynamically based on active filters
  const groupedSections = useMemo(() => {
    const map = {};
    statementData.transactions.forEach(tx => {
      const key = tx.sectionKey || 'General / Uncategorized';
      if (!map[key]) map[key] = [];
      map[key].push(tx);
    });

    return Object.keys(map).map(key => {
      const items = map[key];
      const entityCode = items[0]?.entKey || 'General';
      return {
        sectionKey: key,
        entityCode,
        items
      };
    }).sort((a, b) => {
      if (a.sectionKey.startsWith('General')) return 1;
      if (b.sectionKey.startsWith('General')) return -1;
      return a.sectionKey.localeCompare(b.sectionKey);
    });
  }, [statementData]);

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'stretch', flex: 1, minHeight: 0, minWidth: 0, gap: 16, position: 'relative' }}>
      {error && (
        <div className="err-page" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Left Sidebar Filters Panel */}
      {isSidebarCollapsed ? (
        <div style={{
          width: '44px',
          minWidth: '44px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '16px 0',
          gap: 20,
          zIndex: 10
        }}>
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            title="Expand Filters"
            style={{
              background: 'var(--soft)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: 'var(--orange2)'
            }}
          >
            ▶
          </button>
          <div style={{
            transform: 'rotate(-90deg)',
            textTransform: 'uppercase',
            fontSize: '11px',
            fontWeight: '800',
            color: 'var(--muted)',
            letterSpacing: '2px',
            userSelect: 'none',
            marginTop: '32px',
            whiteSpace: 'nowrap'
          }}>
            Filter Panel
          </div>
        </div>
      ) : (
        <div style={{ width: '44px', minWidth: '44px' }}>
          <div ref={sidebarRef} style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '280px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            zIndex: 20
          }}>
          {/* Header with Collapse Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filters</span>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              title="Collapse Filters"
              style={{
                background: 'var(--soft)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              ◀ Hide
            </button>
          </div>
        {/* Main Filters Vertical Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, minHeight: 0, paddingRight: '4px' }}>
          {/* Account Selection & Generate Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
          {/* Account Selection Searchable Autocomplete Combobox */}
          <div 
            ref={dropdownRef} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 6,
              position: 'relative' 
            }}
          >
            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase' }}>Select Account</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setIsOpen(true);
                  if (!e.target.value) {
                    setSelectedAccountNum('');
                  }
                }}
                onFocus={() => {
                  setIsOpen(true);
                  setSearchText('');
                }}
                placeholder="🔍 Search and choose account..."
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 32px 0 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  background: 'var(--soft)',
                  color: 'var(--text)',
                  outline: 'none',
                  fontFamily: 'var(--font)'
                }}
              />
              {searchText && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchText('');
                    setSelectedAccountNum('');
                    setIsOpen(true);
                  }}
                  style={{
                    position: 'absolute',
                    right: '32px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: 'var(--hint)'
                  }}
                >
                  ✕
                </button>
              )}
              <span
                onClick={() => setIsOpen(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  color: 'var(--muted)',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease'
                }}
              >
                ▼
              </span>
            </div>

            {isOpen && (
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
                {filteredAccounts.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                    No accounts match search terms
                  </div>
                ) : (
                  filteredAccounts.map(acc => {
                    const isCurrent = acc.AccountNumber === selectedAccountNum;
                    return (
                      <div
                        key={acc.AccountNumber}
                        onClick={() => {
                          setSelectedAccountNum(acc.AccountNumber);
                          setSearchText(`${acc.AccountNumber} - ${acc.AccountDescription}`);
                          setIsOpen(false);
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
                          {acc.AccountNumber} - {acc.AccountDescription}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: 'var(--muted)',
                          background: 'var(--soft)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {acc.AccountType}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button 
            className="btn-primary" 
            onClick={handleSearch} 
            disabled={loading || !selectedAccountNum}
            style={{ height: '38px', width: '100%', fontWeight: '700', borderRadius: '10px', whiteSpace: 'nowrap', fontSize: '13px' }}
          >
            {loading ? 'Fetching…' : '🔍 Generate'}
          </button>
        </div>

        {/* Filter Sections: Date, Customer, Vendor */}
          
          {/* 📅 Date Section */}
          <div style={{ 
            background: 'var(--soft)', 
            borderRadius: '12px', 
            padding: '12px', 
            border: '1px solid var(--border)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: isDateCollapsed ? 0 : 10 
          }}>
            <div 
              onClick={() => setIsDateCollapsed(prev => !prev)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                fontSize: '11px', 
                fontWeight: '800', 
                color: 'var(--orange-dark)', 
                textTransform: 'uppercase', 
                borderBottom: isDateCollapsed ? 'none' : '1px solid var(--border)', 
                paddingBottom: isDateCollapsed ? '0' : '6px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📅</span> Date
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{isDateCollapsed ? '▼' : '▲'}</span>
            </div>
            {!isDateCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Start Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      outline: 'none',
                      fontFamily: 'var(--font)'
                    }}
                  />
                </div>

                {/* End Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      outline: 'none',
                      fontFamily: 'var(--font)'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 💵 Currency Section */}
          <div style={{ 
            background: 'var(--soft)', 
            borderRadius: '12px', 
            padding: '12px', 
            border: '1px solid var(--border)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: isCurrencyCollapsed ? 0 : 10 
          }}>
            <div 
              onClick={() => setIsCurrencyCollapsed(prev => !prev)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                fontSize: '11px', 
                fontWeight: '800', 
                color: 'var(--orange-dark)', 
                textTransform: 'uppercase', 
                borderBottom: isCurrencyCollapsed ? 'none' : '1px solid var(--border)', 
                paddingBottom: isCurrencyCollapsed ? '0' : '6px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>💵</span> Currency
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{isCurrencyCollapsed ? '▼' : '▲'}</span>
            </div>
            {!isCurrencyCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    outline: 'none',
                    fontFamily: 'var(--font)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">All Currencies</option>
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            )}
          </div>

          {/* 🏢 Customer Section */}
          <div style={{ 
            background: 'var(--soft)', 
            borderRadius: '12px', 
            padding: '12px', 
            border: '1px solid var(--border)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: isCustomerCollapsed ? 0 : 10 
          }}>
            <div 
              onClick={() => setIsCustomerCollapsed(prev => !prev)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                fontSize: '11px', 
                fontWeight: '800', 
                color: 'var(--orange-dark)', 
                textTransform: 'uppercase', 
                borderBottom: isCustomerCollapsed ? 'none' : '1px solid var(--border)', 
                paddingBottom: isCustomerCollapsed ? '0' : '6px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🏢</span> Customer
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{isCustomerCollapsed ? '▼' : '▲'}</span>
            </div>
            {!isCustomerCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* From Customer */}
              <div 
                ref={fromCustRef} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 4,
                  position: 'relative' 
                }}
              >
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>From Customer</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={fromCustSearch}
                    onChange={(e) => {
                      setFromCustSearch(e.target.value);
                      setIsFromCustOpen(true);
                      if (!e.target.value) {
                        setSelectedFromCust('');
                      }
                    }}
                    onFocus={() => {
                      setIsFromCustOpen(true);
                      setFromCustSearch('');
                    }}
                    placeholder="Search from..."
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 32px 0 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      outline: 'none',
                      fontFamily: 'var(--font)'
                    }}
                  />
                  {fromCustSearch && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFromCustSearch('');
                        setSelectedFromCust('');
                        setIsFromCustOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: '32px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: 'var(--hint)'
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <span
                    onClick={() => setIsFromCustOpen(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: 'var(--muted)',
                      transform: isFromCustOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    ▼
                  </span>
                </div>

                {isFromCustOpen && (
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
                    {filteredFromCustomers.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                        No customers match
                      </div>
                    ) : (
                      filteredFromCustomers.filter(Boolean).map(cust => {
                        const isCurrent = String(cust.CustomerNo) === String(selectedFromCust);
                        return (
                          <div
                            key={cust.CustomerNo}
                            onClick={() => {
                              setSelectedFromCust(cust.CustomerNo);
                              setFromCustSearch(`${cust.CustomerNo} - ${cust.CustomerName}`);
                              setIsFromCustOpen(false);
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
                              {cust.CustomerNo} - {cust.CustomerName}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* To Customer */}
              <div 
                ref={toCustRef} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 4,
                  position: 'relative' 
                }}
              >
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>To Customer</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={toCustSearch}
                    onChange={(e) => {
                      setToCustSearch(e.target.value);
                      setIsToCustOpen(true);
                      if (!e.target.value) {
                        setSelectedToCust('');
                      }
                    }}
                    onFocus={() => {
                      setIsToCustOpen(true);
                      setToCustSearch('');
                    }}
                    placeholder="Search to..."
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 32px 0 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      outline: 'none',
                      fontFamily: 'var(--font)'
                    }}
                  />
                  {toCustSearch && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setToCustSearch('');
                        setSelectedToCust('');
                        setIsToCustOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: '32px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: 'var(--hint)'
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <span
                    onClick={() => setIsToCustOpen(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: 'var(--muted)',
                      transform: isToCustOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    ▼
                  </span>
                </div>

                {isToCustOpen && (
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
                    {filteredToCustomers.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                        No customers match
                      </div>
                    ) : (
                      filteredToCustomers.filter(Boolean).map(cust => {
                        const isCurrent = String(cust.CustomerNo) === String(selectedToCust);
                        return (
                          <div
                            key={cust.CustomerNo}
                            onClick={() => {
                              setSelectedToCust(cust.CustomerNo);
                              setToCustSearch(`${cust.CustomerNo} - ${cust.CustomerName}`);
                              setIsToCustOpen(false);
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
                              {cust.CustomerNo} - {cust.CustomerName}
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

          <div style={{ 
            background: 'var(--soft)', 
            borderRadius: '12px', 
            padding: '12px', 
            border: '1px solid var(--border)',
            display: 'flex', 
            flexDirection: 'column', 
            gap: isVendorCollapsed ? 0 : 10 
          }}>
            <div 
              onClick={() => setIsVendorCollapsed(prev => !prev)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                fontSize: '11px', 
                fontWeight: '800', 
                color: 'var(--orange-dark)', 
                textTransform: 'uppercase', 
                borderBottom: isVendorCollapsed ? 'none' : '1px solid var(--border)', 
                paddingBottom: isVendorCollapsed ? '0' : '6px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🏭</span> Vendor
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{isVendorCollapsed ? '▼' : '▲'}</span>
            </div>
            {!isVendorCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* From Vendor */}
              <div 
                ref={fromVendorRef} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 4,
                  position: 'relative' 
                }}
              >
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>From Vendor</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={fromVendorSearch}
                    onChange={(e) => {
                      setFromVendorSearch(e.target.value);
                      setIsFromVendorOpen(true);
                      if (!e.target.value) {
                        setSelectedFromVendor('');
                      }
                    }}
                    onFocus={() => {
                      setIsFromVendorOpen(true);
                      setFromVendorSearch('');
                    }}
                    placeholder="Search from..."
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 32px 0 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      outline: 'none',
                      fontFamily: 'var(--font)'
                    }}
                  />
                  {fromVendorSearch && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFromVendorSearch('');
                        setSelectedFromVendor('');
                        setIsFromVendorOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: '32px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: 'var(--hint)'
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <span
                    onClick={() => setIsFromVendorOpen(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: 'var(--muted)',
                      transform: isFromVendorOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    ▼
                  </span>
                </div>

                {isFromVendorOpen && (
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
                    {filteredFromVendors.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                        No vendors match
                      </div>
                    ) : (
                      filteredFromVendors.filter(Boolean).map(v => {
                        const isCurrent = String(v.VendorNumber) === String(selectedFromVendor);
                        return (
                          <div
                            key={v.VendorNumber}
                            onClick={() => {
                              setSelectedFromVendor(v.VendorNumber);
                              setFromVendorSearch(`${v.VendorNumber} - ${v.VendorName}`);
                              setIsFromVendorOpen(false);
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
                              {v.VendorNumber} - {v.VendorName}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* To Vendor */}
              <div 
                ref={toVendorRef} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 4,
                  position: 'relative' 
                }}
              >
                <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>To Vendor</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={toVendorSearch}
                    onChange={(e) => {
                      setToVendorSearch(e.target.value);
                      setIsToVendorOpen(true);
                      if (!e.target.value) {
                        setSelectedToVendor('');
                      }
                    }}
                    onFocus={() => {
                      setIsToVendorOpen(true);
                      setToVendorSearch('');
                    }}
                    placeholder="Search to..."
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 32px 0 12px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      outline: 'none',
                      fontFamily: 'var(--font)'
                    }}
                  />
                  {toVendorSearch && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setToVendorSearch('');
                        setSelectedToVendor('');
                        setIsToVendorOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: '32px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: 'var(--hint)'
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <span
                    onClick={() => setIsToVendorOpen(prev => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: 'var(--muted)',
                      transform: isToVendorOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    ▼
                  </span>
                </div>

                {isToVendorOpen && (
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
                    {filteredToVendors.length === 0 ? (
                      <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                        No vendors match
                      </div>
                    ) : (
                      filteredToVendors.filter(Boolean).map(v => {
                        const isCurrent = String(v.VendorNumber) === String(selectedToVendor);
                        return (
                          <div
                            key={v.VendorNumber}
                            onClick={() => {
                              setSelectedToVendor(v.VendorNumber);
                              setToVendorSearch(`${v.VendorNumber} - ${v.VendorName}`);
                              setIsToVendorOpen(false);
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
                              {v.VendorNumber} - {v.VendorName}
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

        {/* Bank Filter Section */}
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isBankCollapsed ? 0 : 10 
          }}>
            <div 
              onClick={() => setIsBankCollapsed(prev => !prev)}
              style={{
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                borderBottom: isBankCollapsed ? 'none' : '1px solid var(--border)', 
                paddingBottom: isBankCollapsed ? '0' : '6px',
                marginBottom: isBankCollapsed ? '0' : '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                <span style={{ fontSize: '13px' }}>🏦</span>
                <span style={{ fontSize: '12.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bank</span>
              </div>
              <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{isBankCollapsed ? '▼' : '▲'}</span>
            </div>
            
            {!isBankCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* From Bank */}
                <div 
                  ref={fromBankRef} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>From Bank</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search from..."
                      value={fromBankSearch}
                      onChange={(e) => {
                        setFromBankSearch(e.target.value);
                        setIsFromBankOpen(true);
                      }}
                      onFocus={() => setIsFromBankOpen(true)}
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
                    {fromBankSearch && (
                      <button
                        title="Clear Bank"
                        onClick={() => {
                          setFromBankSearch('');
                          setSelectedFromBank('');
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
                      onClick={() => setIsFromBankOpen(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isFromBankOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isFromBankOpen && (
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
                      {filteredFromBanks.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No banks match
                        </div>
                      ) : (
                        filteredFromBanks.filter(Boolean).map(b => {
                          const isCurrent = String(b.BankAccountNumber) === String(selectedFromBank);
                          return (
                            <div
                              key={b.BankAccountNumber}
                              onClick={() => {
                                setSelectedFromBank(b.BankAccountNumber);
                                setFromBankSearch(`${b.BankAccountNumber} - ${b.BankAccountName}`);
                                setIsFromBankOpen(false);
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
                                {b.BankAccountNumber} - {b.BankAccountName}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* To Bank */}
                <div 
                  ref={toBankRef} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 6,
                    position: 'relative' 
                  }}
                >
                  <label style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase' }}>To Bank</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search to..."
                      value={toBankSearch}
                      onChange={(e) => {
                        setToBankSearch(e.target.value);
                        setIsToBankOpen(true);
                      }}
                      onFocus={() => setIsToBankOpen(true)}
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
                    {toBankSearch && (
                      <button
                        title="Clear Bank"
                        onClick={() => {
                          setToBankSearch('');
                          setSelectedToBank('');
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
                      onClick={() => setIsToBankOpen(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        transform: isToBankOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isToBankOpen && (
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
                      {filteredToBanks.length === 0 ? (
                        <div style={{ padding: '8px 12px', fontSize: '12.5px', color: 'var(--muted)' }}>
                          No banks match
                        </div>
                      ) : (
                        filteredToBanks.filter(Boolean).map(b => {
                          const isCurrent = String(b.BankAccountNumber) === String(selectedToBank);
                          return (
                            <div
                              key={b.BankAccountNumber}
                              onClick={() => {
                                setSelectedToBank(b.BankAccountNumber);
                                setToBankSearch(`${b.BankAccountNumber} - ${b.BankAccountName}`);
                                setIsToBankOpen(false);
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
                                {b.BankAccountNumber} - {b.BankAccountName}
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


          </div>
        </div>
      </div>
      )}

      {/* Right Side Data Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'auto' }}>
        {!hasSearched ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--muted)',
            textAlign: 'center',
            padding: '64px 0',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px'
          }}>
            <span style={{ fontSize: '48px', marginBottom: 16 }}>📋</span>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px', fontWeight: '700' }}>No Statement Generated Yet</h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', maxWidth: '320px' }}>Select an account and date range, then click "Generate" to see details.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 16 }}>
          {/* Summary KPIs Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {/* Opening Balance */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase' }}>Opening Balance</div>
              <div style={{ fontSize: '20px', fontWeight: '800', marginTop: 4, color: 'var(--text)' }}>
                {fmtAmt(statementData.summary.openingBalance)}
              </div>
            </div>

            {/* Inflow/Debit */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase' }}>Total Inflows (Debit)</div>
              <div style={{ fontSize: '20px', fontWeight: '800', marginTop: 4, color: 'var(--green)' }}>
                +{fmtAmt(statementData.summary.totalDebit)}
              </div>
            </div>

            {/* Outflow/Credit */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase' }}>Total Outflows (Credit)</div>
              <div style={{ fontSize: '20px', fontWeight: '800', marginTop: 4, color: 'var(--red)' }}>
                -{fmtAmt(statementData.summary.totalCredit)}
              </div>
            </div>

            {/* Net Change */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--muted)', textTransform: 'uppercase' }}>Net Change</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '800', 
                marginTop: 4, 
                color: statementData.summary.netChange >= 0 ? 'var(--green)' : 'var(--red)' 
              }}>
                {statementData.summary.netChange >= 0 ? '+' : ''}{fmtAmt(statementData.summary.netChange)}
              </div>
            </div>

            {/* Closing Balance */}
            <div style={{
              background: 'linear-gradient(135deg, var(--orange-glow), rgba(249,115,22,0.05))',
              border: '1.5px solid var(--orange)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 2px 4px rgba(249,115,22,0.05)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--orange2)', textTransform: 'uppercase' }}>Closing Balance</div>
              <div style={{ fontSize: '22px', fontWeight: '900', marginTop: 4, color: 'var(--text)' }}>
                {fmtAmt(statementData.summary.closingBalance)}
              </div>
            </div>
          </div>

          {/* Statement Feed Container */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            boxShadow: 'var(--shadow)',
            padding: '24px',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* Toolbar: Search Filter & Display Mode Toggles */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* View Toggle Buttons */}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', background: 'var(--soft)', padding: 4, borderRadius: '12px' }}>
                <button
                  onClick={() => setViewMode('statement')}
                  style={{
                    height: '32px',
                    padding: '0 16px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: viewMode === 'statement' ? 'var(--surface)' : 'transparent',
                    color: viewMode === 'statement' ? 'var(--orange2)' : 'var(--muted)',
                    boxShadow: viewMode === 'statement' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Statement
                </button>
                <button
                  onClick={() => setViewMode('trial_balance')}
                  style={{
                    height: '32px',
                    padding: '0 16px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: viewMode === 'trial_balance' ? 'var(--surface)' : 'transparent',
                    color: viewMode === 'trial_balance' ? 'var(--orange2)' : 'var(--muted)',
                    boxShadow: viewMode === 'trial_balance' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Trial Balance
                </button>
              </div>

              {/* Filter Input */}
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Filter statement lines by description, reference, journal no, etc..."
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 16px',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    background: 'var(--soft)',
                    color: 'var(--text)',
                    outline: 'none',
                    fontFamily: 'var(--font)'
                  }}
                />
              </div>

              {/* View Toggle Buttons */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {displayMode === 'compact' && (
                  <button
                    onClick={() => setShowBorders(prev => !prev)}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: showBorders ? 'rgba(249,115,22,0.08)' : 'var(--surface)',
                      color: showBorders ? 'var(--orange-dark)' : 'var(--text)',
                      borderColor: showBorders ? 'var(--orange)' : 'var(--border)',
                      transition: 'all 0.15s ease',
                      fontFamily: 'var(--font)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {showBorders ? '🌐 Grid borders: ON' : '⚪ Grid borders: OFF'}
                  </button>
                )}

                <div style={{ display: 'flex', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', gap: '3px' }}>
                  {[
                    { id: 'compact', label: '📊 Compact List' },
                    { id: 'feed', label: '📋 Timeline Feed' }
                  ].map(opt => {
                    const isActive = displayMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setDisplayMode(opt.id)}
                        style={{
                          height: '32px',
                          padding: '0 16px',
                          border: 'none',
                          borderRadius: '7px',
                          fontSize: '12px',
                          fontWeight: isActive ? '700' : '600',
                          cursor: 'pointer',
                          background: isActive ? 'linear-gradient(135deg, var(--orange), var(--orange-dark))' : 'var(--surface)',
                          color: isActive ? '#fff' : 'var(--text)',
                          boxShadow: isActive ? '0 2px 4px rgba(249,115,22,0.2)' : 'none',
                          transition: 'all 0.15s ease',
                          fontFamily: 'var(--font)',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '8px' }}>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
                  <svg width="38" height="38" viewBox="0 0 38 38" stroke="var(--orange)">
                    <g fill="none" fillRule="evenodd">
                      <g transform="translate(1 1)" strokeWidth="3">
                        <circle strokeOpacity=".2" cx="18" cy="18" r="18"/>
                        <path d="M36 18c0-9.94-8.06-18-18-18">
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 18 18"
                            to="360 18 18"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </path>
                      </g>
                    </g>
                  </svg>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted)', letterSpacing: '0.5px' }}>Fetching statement transactions...</div>
                </div>
              ) : viewMode === 'trial_balance' ? (
                <div style={{ 
                  background: 'var(--surface)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '16px', 
                  overflow: 'hidden' 
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--soft)', color: 'var(--muted)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>Entity</th>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Opening</th>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Debit</th>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Credit</th>
                        <th style={{ padding: '16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedSections.map((group, idx) => {
                        const openBal = statementData.entityOpenings[group.entityCode] || 0;
                        const deb = statementData.entityDebits[group.entityCode] || 0;
                        const cred = statementData.entityCredits[group.entityCode] || 0;
                        const closeBal = statementData.entityClosingBalances[group.entityCode] || 0;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '16px', fontWeight: '700', color: 'var(--text)' }}>{group.sectionKey}</td>
                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>{fmtAmt(openBal)}</td>
                            <td style={{ padding: '16px', textAlign: 'right', color: 'var(--green)', fontWeight: '600' }}>{fmtAmt(deb)}</td>
                            <td style={{ padding: '16px', textAlign: 'right', color: 'var(--red)', fontWeight: '600' }}>{fmtAmt(cred)}</td>
                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800' }}>{fmtAmt(closeBal)}</td>
                          </tr>
                        );
                      })}
                      <tr style={{ background: 'var(--soft)' }}>
                        <td style={{ padding: '16px', fontWeight: '900', color: 'var(--text)', textTransform: 'uppercase' }}>Total</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800' }}>{fmtAmt(statementData.summary.openingBalance)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', color: 'var(--green)', fontWeight: '800' }}>{fmtAmt(statementData.summary.totalDebit)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', color: 'var(--red)', fontWeight: '800' }}>{fmtAmt(statementData.summary.totalCredit)}</td>
                        <td style={{ padding: '16px', textAlign: 'right', fontWeight: '900', color: 'var(--orange2)' }}>{fmtAmt(statementData.summary.closingBalance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : groupedSections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  No transactions found matching the filter criteria.
                </div>
              ) : displayMode === 'compact' ? (
                /* 📊 COMPACT HIGH-DENSITY LEDGER SHEET VIEW */
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  width: '100%',
                  border: showBorders ? '1px solid var(--border)' : 'none',
                  borderRadius: showBorders ? '12px' : '0',
                  overflow: 'hidden'
                }}>
                  {/* Dense Sticky Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--soft)',
                    borderBottom: '2px solid var(--border)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    fontWeight: '800',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    textTransform: 'uppercase'
                  }}>
                    <div style={{ width: '90px', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>Date</div>
                    <div style={{ width: '190px', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>Ref / Journal</div>
                    <div style={{ flex: 1, textAlign: 'center', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>Description</div>
                    <div style={{ width: '110px', textAlign: 'right', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>Debit (+)</div>
                    <div style={{ width: '110px', textAlign: 'right', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>Credit (-)</div>
                    <div style={{ width: '120px', textAlign: 'right', paddingLeft: showBorders ? '8px' : '0' }}>Balance</div>
                  </div>

                  {/* 2. Grouped Sections */}
                  {groupedSections.map((group, gIdx) => {
                    const groupDebit = group.items.reduce((sum, item) => sum + Number(item.DebitBook || 0), 0);
                    const groupCredit = group.items.reduce((sum, item) => sum + Number(item.CreditBook || 0), 0);

                    return (
                      <React.Fragment key={group.sectionKey}>
                        {/* Group Header Row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--soft)',
                          borderBottom: '1px solid var(--border)',
                          fontWeight: '800',
                          fontSize: '13px',
                          color: 'var(--orange-dark)',
                          letterSpacing: '0.5px'
                        }}>
                          <span style={{ marginRight: 8 }}></span>
                          {group.sectionKey} 
                          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '600', marginLeft: 8 }}>
                            ({group.items.length} {group.items.length === 1 ? 'record' : 'records'})
                          </span>
                        </div>

                        {/* Group Opening Balance Row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 12px',
                          borderBottom: '1px solid var(--border)',
                          background: 'rgba(249,115,22,0.02)',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: 'var(--text)'
                        }}>
                          <div style={{ width: '90px', color: 'var(--muted)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>—</div>
                          <div style={{ width: '190px', color: 'var(--muted)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>OPENING</div>
                          <div style={{ flex: 1, textAlign: 'center', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>
                            Opening Balance for this section
                          </div>
                          <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '110px', borderRight: showBorders ? '1px solid var(--border)' : 'none' }}></div>
                          <div style={{ width: '120px', textAlign: 'right', fontFamily: 'var(--mono)', paddingLeft: showBorders ? '8px' : '0' }}>
                            {fmtAmt(statementData.entityOpenings[group.entityCode] || 0)}
                          </div>
                        </div>

                        {/* Group Items */}
                        {group.items.map((item, idx) => {
                          const isDebit = Number(item.DebitBook || 0) > 0;
                          const amount = isDebit ? Number(item.DebitBook || 0) : Number(item.CreditBook || 0);

                          return (
                            <div 
                              key={`${item.JournalNo}_${item.Line}_${idx}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 12px',
                                borderBottom: '1px solid var(--border)',
                                background: idx % 2 === 0 ? 'transparent' : 'var(--soft)',
                                fontSize: '12.5px',
                                color: 'var(--text)',
                                transition: 'background 0.1s ease'
                              }}
                              className="ledger-row-compact"
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--orange-glow)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--soft)'}
                            >
                              {/* Date */}
                              <div style={{ width: '90px', fontSize: '12px', color: 'var(--muted)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                                {item.JournalDate ? item.JournalDate.split('T')[0] : '—'}
                              </div>
                              
                              {/* Ref / Journal */}
                              <div style={{ 
                                width: '190px', 
                                fontSize: '11.5px', 
                                color: 'var(--muted)', 
                                fontFamily: 'var(--mono)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingLeft: showBorders ? '8px' : '0',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                EV-{item.EventNo}/JN-{item.JournalNo}
                              </div>
                              
                              {/* Description */}
                              <div style={{ 
                                flex: 1, 
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingLeft: showBorders ? '8px' : '0',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {item.LineDescription || 'No description'}
                                {item.CustomerName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.CustomerName})</span>}
                                {item.VendorName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.VendorName})</span>}
                                {item.EmployeeName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.EmployeeName})</span>}
                                {item.AssetName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.AssetName})</span>}
                                {item.ExpenseName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.ExpenseName})</span>}
                                {item.Reference1 && <span style={{ color: 'var(--muted)', fontSize: '11px', marginLeft: 8 }}>(Ref: {item.Reference1})</span>}
                              </div>
                              
                              {/* Debit */}
                              <div style={{ 
                                width: '110px', 
                                textAlign: 'right', 
                                fontWeight: '700', 
                                color: 'var(--green)',
                                fontFamily: 'var(--mono)',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {isDebit ? fmtAmt(amount) : ''}
                              </div>
                              
                              {/* Credit */}
                              <div style={{ 
                                width: '110px', 
                                textAlign: 'right', 
                                fontWeight: '700', 
                                color: 'var(--red)',
                                fontFamily: 'var(--mono)',
                                borderRight: showBorders ? '1px solid var(--border)' : 'none',
                                paddingRight: showBorders ? '8px' : '0'
                              }}>
                                {!isDebit ? fmtAmt(amount) : ''}
                              </div>
                              
                              {/* Running Balance */}
                              <div style={{ 
                                width: '120px', 
                                textAlign: 'right', 
                                fontWeight: '700',
                                fontFamily: 'var(--mono)',
                                color: 'var(--text)',
                                paddingLeft: showBorders ? '8px' : '0'
                              }}>
                                {fmtAmt(item.runningBalance)}
                              </div>
                            </div>
                          );
                        })}

                        {/* Group Subtotal Row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 12px',
                          borderBottom: '1.5px solid var(--border)',
                          background: 'rgba(0,0,0,0.01)',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: 'var(--muted)'
                        }}>
                          <div style={{ width: '90px', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>—</div>
                          <div style={{ width: '190px', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}></div>
                          <div style={{ flex: 1, textAlign: 'right', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: '12px', textTransform: 'uppercase' }}>Subtotal:</div>
                          <div style={{ width: '110px', textAlign: 'right', color: 'var(--green)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                            {groupDebit > 0 ? `+${fmtAmt(groupDebit)}` : ''}
                          </div>
                          <div style={{ width: '110px', textAlign: 'right', color: 'var(--red)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                            {groupCredit > 0 ? `-${fmtAmt(groupCredit)}` : ''}
                          </div>
                          <div style={{ width: '120px', textAlign: 'right', fontFamily: 'var(--mono)', paddingLeft: showBorders ? '8px' : '0', color: 'var(--orange-dark)', fontWeight: '800' }}>
                            Closing: {fmtAmt(statementData.entityClosingBalances[group.entityCode] || 0)}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* 3. Closing Balance Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderTop: '2px solid var(--border)',
                    background: 'var(--orange-soft)',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    color: 'var(--text)'
                  }}>
                    <div style={{ width: '90px', color: 'var(--muted)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>—</div>
                    <div style={{ width: '190px', color: 'var(--muted)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>CLOSING</div>
                    <div style={{ flex: 1, textAlign: 'center', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingLeft: showBorders ? '8px' : '0', paddingRight: showBorders ? '8px' : '0' }}>Closing Balance period summary</div>
                    <div style={{ width: '110px', textAlign: 'right', color: 'var(--green)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                      +{fmtAmt(statementData.summary.totalDebit)}
                    </div>
                    <div style={{ width: '110px', textAlign: 'right', color: 'var(--red)', fontFamily: 'var(--mono)', borderRight: showBorders ? '1px solid var(--border)' : 'none', paddingRight: showBorders ? '8px' : '0' }}>
                      -{fmtAmt(statementData.summary.totalCredit)}
                    </div>
                    <div style={{ width: '120px', textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--orange-dark)', fontSize: '13.5px', paddingLeft: showBorders ? '8px' : '0' }}>
                      {fmtAmt(statementData.summary.closingBalance)}
                    </div>
                  </div>
                </div>
              ) : (
                /* 📋 TIMELINE FEED VIEW (ORIGINAL LAYOUT) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Opening balance indicator at start of timeline */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    background: 'var(--soft)',
                    borderRadius: '12px',
                    borderLeft: '4px solid var(--orange)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '16px' }}>🏁</span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text)' }}>Opening Balance</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Starting checkpoint balance for the statement period</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)' }}>
                      {fmtAmt(statementData.summary.openingBalance)}
                    </div>
                  </div>

                  {/* Section groups in Feed view */}
                  {groupedSections.map(group => (
                    <div key={group.sectionKey} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Heading Header */}
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '800',
                        color: 'var(--orange2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderBottom: '2px solid var(--border)',
                        paddingBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <span>🏷️</span>
                        <span>{group.sectionKey}</span>
                      </div>

                      {/* Items loop */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {group.items.map((item, i) => {
                          const isDebit = Number(item.DebitBook || 0) > 0;
                          const amount = isDebit ? Number(item.DebitBook || 0) : Number(item.CreditBook || 0);

                          return (
                            <div 
                              key={`${item.JournalNo}_${item.Line}_${i}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                padding: '12px 16px',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                background: 'var(--surface)',
                                transition: 'all 0.15s ease',
                                cursor: 'default'
                              }}
                              className="statement-item-card"
                            >
                              {/* Left Arrow Icon */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isDebit ? 'var(--green-soft)' : 'var(--red-soft)',
                                color: isDebit ? 'var(--green)' : 'var(--red)',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}>
                                <span style={{ margin: 'auto' }}>{isDebit ? '↓' : '↑'}</span>
                              </div>

                              {/* Center Meta Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '13.5px', 
                                  fontWeight: '700', 
                                  color: 'var(--text)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis' 
                                }}>
                                  {item.LineDescription || 'No description provided'}
                                  {item.CustomerName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.CustomerName})</span>}
                                  {item.VendorName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.VendorName})</span>}
                                  {item.EmployeeName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.EmployeeName})</span>}
                                  {item.AssetName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.AssetName})</span>}
                                  {item.ExpenseName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.ExpenseName})</span>}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--soft)', padding: '2px 6px', borderRadius: '4px' }}>
                                    EV-{item.EventNo} / JN-{item.JournalNo}
                                  </span>
                                  {item.Reference1 && (
                                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                      Ref: <strong>{item.Reference1}</strong>
                                    </span>
                                  )}
                                  {item.LineCreatedBy && (
                                    <span style={{ fontSize: '11px', color: 'var(--hint)' }}>
                                      By: {item.LineCreatedBy}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Exchange details (if foreign currency) */}
                              {item.LineCurrency !== 'SYP' && (
                                <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>
                                  {item.LineCurrency} @ {item.LineExchangeRate}
                                  {/* Contextual Sub-labels */}
                                  {item.CustomerName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.CustomerName})</span>}
                                  {item.VendorName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.VendorName})</span>}
                                  {item.EmployeeName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.EmployeeName})</span>}
                                  {item.AssetName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.AssetName})</span>}
                                  {item.ExpenseName && <span style={{ color: 'var(--orange-dark)', fontWeight: '700', marginLeft: 8 }}>({item.ExpenseName})</span>}
                                </div>
                              )}

                              {/* Right side amounts */}
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ 
                                  fontSize: '15px', 
                                  fontWeight: '800', 
                                  color: isDebit ? 'var(--green)' : 'var(--red)' 
                                }}>
                                  {isDebit ? '+' : '-'}{fmtAmt(amount)}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: 2 }}>
                                  Bal: <strong>{fmtAmt(item.runningBalance)}</strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Closing balance checkpoint at end of timeline */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    background: 'linear-gradient(135deg, var(--orange-glow), rgba(249,115,22,0.03))',
                    borderRadius: '12px',
                    borderLeft: '4px solid var(--orange)',
                    marginTop: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '16px' }}>🏁</span>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--text)' }}>Closing Balance</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Final checkpoint balance for the statement period</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text)' }}>
                      {fmtAmt(statementData.summary.closingBalance)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  </div>
);
}
