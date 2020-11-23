## Show your level

`!level`

!> Default permission is **VIEWERS**

### Examples

<blockquote>
  <strong>testuser:</strong> !level <br>
  <strong>bot:</strong> @testuser, level: 1 (1030 XP), 1470 XP to next level.
</blockquote>

## Buy a level

`!level buy`

!> Default permission is **VIEWERS**

### Examples

<blockquote>
  <strong>testuser:</strong> !level buy <br>
  <strong>bot:</strong> @testuser, you bought 1460 XP with 14600 points and reached
  level 2.
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !level buy <br>
  <strong>bot:</strong> Sorry @testuser, but you don't have 234370 UEC to buy
  23437 XP for level 5.
</blockquote>

## Change XP of user

`!level change <username> <xp>`

!> Default permission is **CASTERS**

### Parameters

- `<username>` - username to change XP
- `<xp>` - amount of XP to be added or removed

### Examples

<blockquote>
  <strong>owner:</strong>!level change testuser 100 <br>
  <strong>bot:</strong> @owner, you changed XP by 100 XP to @testuser.
</blockquote>

<blockquote>
  <strong>owner:</strong>!level change testuser -100 <br>
  <strong>bot:</strong> @owner, you changed XP by -100 XP to @testuser.
</blockquote>