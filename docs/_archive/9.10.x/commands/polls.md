## Create a new poll

`!poll open -<type> -title "Your title here" Option 1 | Option 2 | ...`

!> Default permission is **OWNER**

### Parameters

- `<type>` -  possible values: normal, bits, tips, *default: normal*
- Options are splitted with **|**

### Examples

<blockquote>
  <strong>owner: </strong> !poll open -title "What is better, Star Citizen
  or Elite: Dangerous?" Star Citizen | Elite: Dangerous <br />
  <strong>bot:</strong> Poll opened for "What is better, Star Citizen
  or Elite: Dangerous?"! You can vote by !vote X  <br />
  <strong>bot:</strong> !vote 1 => Star Citizen <br />
  <strong>bot:</strong> !vote 2 => Elite: Dangerous
</blockquote>

<blockquote>
  <strong>owner:</strong> !poll open -tips -title "What is better, Star Citizen
  or Elite: Dangerous?" Star Citizen | Elite: Dangerous <br />
  <strong>bot:</strong> Poll by tips opened for "What is better, Star Citizen
  or Elite: Dangerous?"! You can vote by adding hashtag #voteX into tip message
  <br />
  <strong>bot:</strong> #vote1 => Star Citizen <br />
  <strong>bot:</strong> #vote2 => Elite: Dangerous <br />
</blockquote>

## How to vote

### Normal (command) voting

`!vote <voteNum>`

!> Default permission is **VIEWERS**

!> Viewer can have only one vote, newest vote is took into consideration

#### Parameters

- `<voteNum>` -  vote number

#### Examples

<blockquote>
  <strong>viewer: </strong> !vote 1 <br />
  <strong>viewer2: </strong> !vote 2 <br />
</blockquote>

<blockquote>
  <strong>owner:</strong> !poll open -tips -title "What is better, Star Citizen
  or Elite: Dangerous?" Star Citizen | Elite: Dangerous <br />
  <strong>bot:</strong> Poll by tips opened for "What is better, Star Citizen
  or Elite: Dangerous?"! You can vote by adding hashtag #voteX into tip message
  <br />
  <strong>bot:</strong> #vote1 => Star Citizen <br />
  <strong>bot:</strong> #vote2 => Elite: Dangerous <br />
</blockquote>

### Tips voting

Voting is achieved by adding `#vote<voteNum>` into tip message

!> Users can have multiple votes, although not through one donation (highest vote
is taking into consideration)

#### Examples

<blockquote>
  <i>+tip, 10USD, message: Lorem Ipsum #vote1</i> < user
  voting for <strong>#vote1</strong> <br />
  <i>+tip, 10USD, message: Lorem Ipsum #vote2 #vote1</i> < user
  voting for <strong>#vote2</strong>
</blockquote>

### Bits (cheer) voting

Voting is achieved by adding `#vote<voteNum>` into cheer message

!> Users can have multiple votes, although not through one cheer (highest vote
is taking into consideration)

#### Examples

<blockquote>
  <strong>viewer:</strong> Cheer10 Cheer10 #vote1 <br />
  <strong>viewer:</strong> Cheer10 Cheer10 I am voting for #vote2
</blockquote>

