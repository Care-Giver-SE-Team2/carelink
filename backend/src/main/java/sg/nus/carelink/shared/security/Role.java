package sg.nus.carelink.shared.security;

/**
 * 系统角色。四类使用者对应四种界面，权限判断一律以此为准。
 * 数据库中以字符串存储（user_role.role），不存序号，避免加角色时错位。
 */
public enum Role {

	/** 主管：排班、审批、异常处置、查看全部数据 */
	MANAGER,

	/** 护理员：执行访视、上报异常 */
	CAREGIVER,

	/** 家属：查看被授权老人的照护记录与周报 */
	FAMILY,

	/** 老人本人：查看自己的日程与访视 */
	ELDER;

	/** Spring Security 约定的权限名带 ROLE_ 前缀 */
	public String authority() {
		return "ROLE_" + name();
	}
}
