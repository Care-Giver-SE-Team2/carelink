package sg.nus.carelink.report.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;

import sg.nus.carelink.report.domain.model.ValueAddedServiceRequest;
import sg.nus.carelink.testsupport.SharedMySql;

/**
 * UC-EL02 then UC-FM08 on real MySQL: V20's durations, the dispatched visit's end, and the
 * notice every manager gets - what the mocked service test cannot see.
 *
 * <p>Mdm Tan asks for a hospital escort in three days at 14:00; her son approves it.
 */
@SpringBootTest
@TestPropertySource(properties = {
		"carelink.rerostering.scan-initial-delay=PT1H",
		"carelink.escalation.scan-initial-delay=PT1H",
		"carelink.roster.uncovered-scan-initial-delay=PT1H"
})
class ValueAddedServiceDispatchIT {

	@DynamicPropertySource
	static void database(DynamicPropertyRegistry registry) {
		SharedMySql.register(registry, ValueAddedServiceDispatchIT.class, null);
	}

	@Autowired
	private ValueAddedServiceRequestService service;
	@Autowired
	private JdbcTemplate jdbc;

	private Long manager;
	private Long otherManager;
	private Long elderAccount;
	private String familyUsername;
	private Long escort;

	@BeforeEach
	void givenAnElderAndHerSon() {
		String run = Long.toString(System.nanoTime(), 36);
		manager = account("mgr-" + run, "MANAGER");
		otherManager = account("mgr2-" + run, "MANAGER");
		elderAccount = account("elder-" + run, "ELDER");
		jdbc.update("insert into elder (user_id, full_name, sector) values (?, 'Mdm Tan', 'Toa Payoh')", elderAccount);
		Long elder = lastId();
		familyUsername = "family-" + run;
		Long familyAccount = account(familyUsername, "FAMILY");
		jdbc.update("insert into family_member (user_id, full_name) values (?, 'Alex Tan')", familyAccount);
		jdbc.update("insert into elder_family_binding (elder_id, family_member_id, relationship, access_scope, status,"
				+ " confirmed_at) values (?, ?, 'SON', 'FULL', 'ACTIVE', ?)", elder, lastId(),
				Timestamp.valueOf(LocalDateTime.of(2026, 9, 1, 9, 0)));
		escort = jdbc.queryForObject("select id from value_added_service where name = 'Hospital escort'", Long.class);
	}

	@Test
	void theCatalogueSaysHowLongEachServiceTakes() {
		assertThat(jdbc.queryForList("select name, duration_minutes from value_added_service")).extracting(
				row -> row.get("name") + " " + row.get("duration_minutes"))
				.contains("Hospital escort 180", "Grocery assistance 90", "Companionship 120", "Light housekeeping 120");
	}

	@Test
	void approvalDispatchesAVisitThatEndsWhenTheServiceDoesAndTellsEveryManager() {
		LocalDateTime start = LocalDate.now(ZoneId.of("Asia/Singapore")).plusDays(3).atTime(14, 0);
		ValueAddedServiceRequest requested = service.requestForElderUser(elderAccount, escort, start, null);

		ValueAddedServiceRequest dispatched = service.decideForFamily(familyUsername, requested.id(),
				ValueAddedServiceRequestService.Decision.APPROVED);

		Map<String, Object> visit = jdbc.queryForMap(
				"select caregiver_id, scheduled_start, scheduled_end, status from visit where id = ?", dispatched.visitId());
		assertThat(visit.get("caregiver_id")).isNull();
		assertThat(visit.get("status")).isEqualTo("SCHEDULED");
		assertThat(((LocalDateTime) visit.get("scheduled_end"))).isEqualTo(start.plusMinutes(180));

		for (Long each : new Long[] { manager, otherManager }) {
			Map<String, Object> notice = jdbc.queryForMap("select title, body, resource_type, resource_id, status"
					+ " from notification where recipient_user_id = ? and event_type = 'EXTRA_SERVICE_DISPATCHED'", each);
			assertThat(notice.get("title")).isEqualTo("Assign a caregiver: Hospital escort for Mdm Tan");
			assertThat((String) notice.get("body")).contains("14:00–17:00").contains("Unassigned visits on the Roster");
			assertThat(notice.get("resource_type")).isEqualTo("VISIT");
			assertThat(((Number) notice.get("resource_id")).longValue()).isEqualTo(dispatched.visitId());
			assertThat(notice.get("status")).isEqualTo("PENDING");
		}
		assertThat(count("select count(*) from notification where recipient_user_id = ?", elderAccount))
				.as("only managers hear of the dispatch").isZero();
	}

	@Test
	void aRejectionTellsNoManager() {
		LocalDateTime start = LocalDate.now(ZoneId.of("Asia/Singapore")).plusDays(3).atTime(9, 0);
		ValueAddedServiceRequest requested = service.requestForElderUser(elderAccount, escort, start, null);

		service.decideForFamily(familyUsername, requested.id(), ValueAddedServiceRequestService.Decision.REJECTED);

		assertThat(count("select count(*) from notification where recipient_user_id = ?"
				+ " and event_type = 'EXTRA_SERVICE_DISPATCHED'", manager)).isZero();
	}

	private Long account(String username, String role) {
		jdbc.update("insert into app_user (username, password_hash, display_name, enabled) values (?, '{noop}x', ?, true)",
				username, username);
		Long id = lastId();
		jdbc.update("insert into user_role (user_id, role) values (?, ?)", id, role);
		return id;
	}

	private long count(String sql, Object... args) {
		Long rows = jdbc.queryForObject(sql, Long.class, args);
		return rows == null ? 0L : rows;
	}

	private Long lastId() {
		return jdbc.queryForObject("select last_insert_id()", Long.class);
	}
}
