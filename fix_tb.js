const fs = require('fs');
let content = fs.readFileSync('src/pages/TrialBalance.jsx', 'utf8');

const targetStr = `) : filteredData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  No accounts found matching the filter criteria.
                </div>
              ) : (`;

const endIdx = content.indexOf(targetStr);
if (endIdx > -1) {
  // Find where the table block ends, to keep the table block!
  const tableBlockEndStr = `</table>
                </div>
              ) : filteredData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)' }}>
                  No accounts found matching the filter criteria.
                </div>
              ) : (`;
  
  const actualTarget = `              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  width: '100%',
                  border: showBorders ? '1px solid var(--border)' : 'none',`;
  
  const badStart = content.indexOf(actualTarget);
  if (badStart > -1) {
    const endBlock = `
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`;
    content = content.substring(0, badStart) + endBlock;
    fs.writeFileSync('src/pages/TrialBalance.jsx', content);
    console.log("Fixed TrialBalance.jsx");
  }
}

