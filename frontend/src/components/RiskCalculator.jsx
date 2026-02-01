import { useState, useEffect } from 'react';
import { useToast } from './Toast';

const API_BASE = '/api';

/**
 * Risk Calculator Component
 * Position sizing, trade risk calculation, portfolio management
 */
function RiskCalculator() {
  const toast = useToast();
  const [accountSize, setAccountSize] = useState(100000);
  const [riskPercent, setRiskPercent] = useState(2);
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dailyRisk, setDailyRisk] = useState(null);

  // Calculate position size when inputs change
  const calculateRisk = async () => {
    if (!entryPrice || !stopLoss || !target) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/risk/trade-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capital: accountSize,
          riskPercent: riskPercent,
          entry: parseFloat(entryPrice),
          stopLoss: parseFloat(stopLoss),
          target: parseFloat(target)
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalculation(data);
      }
    } catch (err) {
      toast.error('Failed to calculate risk');
    }
    setLoading(false);
  };

  // Fetch daily risk check
  const fetchDailyRiskCheck = async () => {
    try {
      const response = await fetch(`${API_BASE}/risk/daily-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capital: accountSize,
          dailyPnL: 0
        })
      });
      
      if (response.ok) {
        setDailyRisk(await response.json());
      }
    } catch (err) {
      // Silent fail for daily risk check
    }
  };

  useEffect(() => {
    if (entryPrice && stopLoss && target) {
      calculateRisk();
    }
  }, [entryPrice, stopLoss, target, accountSize, riskPercent]);

  useEffect(() => {
    fetchDailyRiskCheck();
  }, [accountSize]);

  const riskColor = calculation?.riskRewardRatio >= 2 ? 'var(--accent-green)' : 
                    calculation?.riskRewardRatio >= 1.5 ? 'var(--accent-orange)' : 
                    'var(--accent-red)';

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      border: '1px solid var(--border-light)',
      marginBottom: '24px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '1.3rem', 
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 Risk Calculator
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 8px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            borderRadius: 'var(--radius-full)'
          }}>
            MONEY MANAGEMENT
          </span>
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Calculate position size, risk/reward, and manage your capital
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {/* Input Section */}
        <div style={{
          background: 'var(--bg-primary)',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)'
        }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: 'var(--text-primary)'
          }}>
            Trade Parameters
          </h3>

          {/* Account Size */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)',
              marginBottom: '6px'
            }}>
              💰 Account Size (₹)
            </label>
            <input
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontSize: '1rem',
                background: 'var(--bg-secondary)'
              }}
            />
          </div>

          {/* Risk Percentage */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)',
              marginBottom: '6px'
            }}>
              ⚡ Risk Per Trade: {riskPercent}%
            </label>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              style={{
                width: '100%',
                cursor: 'pointer'
              }}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              <span>0.5% (Safe)</span>
              <span>5% (Aggressive)</span>
            </div>
          </div>

          {/* Entry Price */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)',
              marginBottom: '6px'
            }}>
              📍 Entry Price (₹)
            </label>
            <input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="e.g., 1500"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontSize: '1rem',
                background: 'var(--bg-secondary)'
              }}
            />
          </div>

          {/* Stop Loss */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)',
              marginBottom: '6px'
            }}>
              🛑 Stop Loss (₹)
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="e.g., 1450"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontSize: '1rem',
                background: 'var(--bg-secondary)'
              }}
            />
          </div>

          {/* Target */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)',
              marginBottom: '6px'
            }}>
              🎯 Target Price (₹)
            </label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g., 1600"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontSize: '1rem',
                background: 'var(--bg-secondary)'
              }}
            />
          </div>

          {/* Quick Fill Buttons */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px'
          }}>
            <button
              onClick={() => {
                setEntryPrice('100');
                setStopLoss('95');
                setTarget('115');
              }}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Example Trade
            </button>
            <button
              onClick={() => {
                setEntryPrice('');
                setStopLoss('');
                setTarget('');
                setCalculation(null);
              }}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div style={{
          background: 'var(--bg-primary)',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)'
        }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: '600', 
            marginBottom: '16px',
            color: 'var(--text-primary)'
          }}>
            Calculation Results
          </h3>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
            </div>
          )}

          {!loading && calculation && (
            <>
              {/* Position Size Card */}
              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #F59E0B22, #D9770622)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--accent-orange)',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  POSITION SIZE
                </div>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: '700',
                  color: 'var(--accent-orange)'
                }}>
                  {calculation.positionSize} shares
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Investment: ₹{calculation.investment?.toLocaleString()}
                </div>
              </div>

              {/* Risk Metrics Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Max Risk
                  </div>
                  <div style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '700',
                    color: 'var(--accent-red)'
                  }}>
                    ₹{calculation.maxRisk?.toLocaleString()}
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Potential Profit
                  </div>
                  <div style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '700',
                    color: 'var(--accent-green)'
                  }}>
                    ₹{calculation.potentialProfit?.toLocaleString()}
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Risk %
                  </div>
                  <div style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '700'
                  }}>
                    {calculation.riskPercent?.toFixed(2)}%
                  </div>
                </div>
                <div style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Reward %
                  </div>
                  <div style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: '700'
                  }}>
                    {calculation.rewardPercent?.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Risk:Reward Visualization */}
              <div style={{
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)',
                  marginBottom: '8px'
                }}>
                  RISK : REWARD RATIO
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: '700',
                    color: riskColor
                  }}>
                    1:{calculation.riskRewardRatio}
                  </div>
                  <div style={{
                    flex: 1,
                    height: '20px',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                    display: 'flex'
                  }}>
                    <div style={{
                      width: `${100 / (1 + calculation.riskRewardRatio)}%`,
                      background: 'var(--accent-red)',
                      height: '100%'
                    }}></div>
                    <div style={{
                      flex: 1,
                      background: 'var(--accent-green)',
                      height: '100%'
                    }}></div>
                  </div>
                </div>
                <div style={{
                  marginTop: '8px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}>
                  {calculation.riskRewardRatio >= 2 ? 
                    '✅ Excellent R:R - Good to proceed' :
                    calculation.riskRewardRatio >= 1.5 ?
                    '⚠️ Acceptable R:R - Consider with caution' :
                    '❌ Poor R:R - Not recommended'}
                </div>
              </div>

              {/* Trade Outcome Scenarios */}
              <div style={{
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)',
                  marginBottom: '12px'
                }}>
                  TRADE OUTCOMES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#DCFCE7',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <span>🎯 If Target Hit:</span>
                    <span style={{ fontWeight: '700', color: '#16A34A' }}>
                      +₹{calculation.potentialProfit?.toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#FEE2E2',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <span>🛑 If Stop Loss Hit:</span>
                    <span style={{ fontWeight: '700', color: '#DC2626' }}>
                      -₹{calculation.maxRisk?.toLocaleString()}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    <span>📊 Breakeven Point:</span>
                    <span style={{ fontWeight: '700' }}>
                      ₹{entryPrice}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {!loading && !calculation && (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.5 }}>
                📊
              </div>
              <p>Enter trade parameters to see calculations</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Risk Status */}
      {dailyRisk && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)'
        }}>
          <h3 style={{ 
            fontSize: '1rem', 
            fontWeight: '600', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📅 Daily Risk Status
            <span style={{
              padding: '4px 12px',
              background: dailyRisk.canTrade ? '#DCFCE7' : '#FEE2E2',
              color: dailyRisk.canTrade ? '#16A34A' : '#DC2626',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              {dailyRisk.canTrade ? 'TRADING ALLOWED' : 'TRADING PAUSED'}
            </span>
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Daily P&L
              </div>
              <div style={{ 
                fontSize: '1.3rem', 
                fontWeight: '700',
                color: dailyRisk.dailyPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
              }}>
                {dailyRisk.dailyPnL >= 0 ? '+' : ''}₹{dailyRisk.dailyPnL?.toLocaleString() || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Loss Used
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: '700' }}>
                {dailyRisk.dailyPnLPercent?.toFixed(1) || 0}% / {dailyRisk.maxAllowed || 5}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Status
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>
                {dailyRisk.passed ? '✅ Passed' : '❌ Failed'}
              </div>
            </div>
          </div>

          {dailyRisk.warnings?.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#FEF3C7',
              borderRadius: 'var(--radius-sm)'
            }}>
              {dailyRisk.warnings.map((warning, i) => (
                <div key={i} style={{ 
                  color: '#D97706', 
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: i < dailyRisk.warnings.length - 1 ? '8px' : 0
                }}>
                  ⚠️ {warning.message || warning}
                </div>
              ))}
            </div>
          )}

          {dailyRisk.recommendation && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>
              💡 {dailyRisk.recommendation}
            </div>
          )}
        </div>
      )}

      {/* Tips Section */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)'
      }}>
        <h4 style={{ 
          fontSize: '0.9rem', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: 'var(--text-primary)'
        }}>
          💡 Risk Management Tips
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            ✓ Never risk more than 2% per trade
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            ✓ Aim for minimum 1:2 risk-reward ratio
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            ✓ Limit daily losses to 5% of capital
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            ✓ Maximum 5 open positions at once
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskCalculator;
