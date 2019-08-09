npx oz publish $@
npx oz push $@
npx truffle compile --all
npx oz create BancorCurveService --no-interactive $@
npx oz create BondingCurveFactory --no-interactive $@
truffle exec ./ecosystem.initialize.js $@
