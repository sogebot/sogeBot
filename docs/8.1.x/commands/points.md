## Points system
### Commands | OWNER
- !points add [username] [number]
    - add [number] points to specified [username]
- !points remove [username] [number]
    - remove [number] points to specified [username]
- !points all [number]
    - add [number] points to all **online** users
- !points set [username] [number]
    - set [number] points to specified [username]
- !points get [username]
    - get points of [username]
- !makeitrain [number]
    - add maximum of [number] points to all **online** users

### Commands | VIEWER
- !points give [username] [number]
    - viewer can give his own [number] points to another [username]
- !points
    - print out points of user

### Settings
`!set pointsName <format|default:from_lang_file>`
  - format: singular|plural **OR** singular|x:multi|plural
  - example of x:multi usage:
    - Kredit|4:Kredity|Kreditu
    - 1 - Kredit
    - 2, 3, 4 - Kredity
    - 5<= - Kreditu

`!set pointsResponse <response|default:from_lang_file>` - available variables to use in response: (amount), (pointsName), (username)

`!set pointsInterval <number|default:10>` - interval in minutes to give points when online

`!set pointsPerInterval <number|default:1>` - how many points to give per interval when online

`!set pointsIntervalOffline <number|default:30>` - interval in minutes to give points when offline

`!set pointsPerIntervalOffline <number|default:1>` - how many points to give per interval when offline

`!set pointsMessageInterval <number|default:5>` - how many messages until points are added

`!set pointsPerMessageInterval <number|default:1>` - how many points given per message interval