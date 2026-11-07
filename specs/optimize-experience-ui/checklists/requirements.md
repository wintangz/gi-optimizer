# Specification Quality Checklist: Optimize Experience UI (`optimize-experience-ui`)

- [x] Unifies ER floor into `constraints` with lossless migration from legacy `erFloor`
- [x] Solver reads exclusively from migrated `constraints`
- [x] Constraints card uses visual stat chips and stat-picker grid
- [x] Build comparison list pins `Current` first followed by `#1..#N` builds with delta `%`, proportional bar, 5 artifact badges, 7 stat chips, and expandable breakdown
- [x] Zero formula, preset data, or golden fixture changes
