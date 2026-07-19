const fs = require('fs');
let code = fs.readFileSync('src/pages/AccountStatement.jsx', 'utf8');
const newFilters = fs.readFileSync('new_filters.jsx', 'utf8');

const targetStr = `                  )}
                </div>
              </div>
            )}
        </div>
          </div>
        </div>
      </div>
      )}

      {/* Right Side Data Area */}`;

const replaceStr = `                  )}
                </div>
              </div>
            )}
        </div>

${newFilters}

          </div>
        </div>
      </div>
      )}

      {/* Right Side Data Area */}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/pages/AccountStatement.jsx', code);
  console.log("Success");
} else {
  console.log("Target string not found!");
}
