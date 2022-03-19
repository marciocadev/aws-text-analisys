export interface User {
  /**
  * User identification
  * **_UserId_** field is the **partition key**
  *
  * @attribute
  */
  readonly UserId: string; // key
  /**
  * User name
  *
  * @attribute
  */
  readonly UserName?: string;
  /**
  * User name
  *
  * @attribute
  */
  readonly NName?: number;
}