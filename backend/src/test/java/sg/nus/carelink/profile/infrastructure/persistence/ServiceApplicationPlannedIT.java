package sg.nus.carelink.profile.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import sg.nus.carelink.profile.domain.model.ServiceApplication;
import sg.nus.carelink.profile.domain.repository.ServiceApplicationRepository;
import sg.nus.carelink.testsupport.SharedMySql;

/** planned_at against real storage: recorded once, kept by later saves, and skipped by the elder list's query. */
@SpringBootTest
class ServiceApplicationPlannedIT {

	private static final LocalDateTime FIRST = LocalDateTime.of(2026, 10, 10, 2, 0);

	@Autowired private ServiceApplicationRepository applications;
	@Autowired private JdbcTemplate jdbc;

	@DynamicPropertySource
	static void database(DynamicPropertyRegistry registry) {
		SharedMySql.register(registry, ServiceApplicationPlannedIT.class, "+00:00");
	}

	@BeforeEach
	void seed() {
		jdbc.update("DELETE FROM care_service_application");
		jdbc.update("DELETE FROM elder_family_binding");
		jdbc.update("DELETE FROM elder");
		jdbc.update("DELETE FROM family_member");
		jdbc.update("DELETE FROM user_role");
		jdbc.update("DELETE FROM app_user");
		jdbc.update("INSERT INTO app_user(id,username,password_hash,display_name) VALUES (7,'family','{noop}test','Family')");
		jdbc.update("INSERT INTO family_member(id,user_id,full_name) VALUES (42,7,'Family')");
		jdbc.update("INSERT INTO elder(id,full_name) VALUES (1,'Tan Mei')");
		jdbc.update("INSERT INTO care_service_application(id,applicant_family_member_id,elder_id,elder_snapshot,care_needs,"
				+ "status,created_at) VALUES (11,42,1,'{}','[\"BATHING\"]','SUBMITTED','2026-10-01 01:00:00'),"
				+ "(12,42,1,'{}','[\"VITALS\"]','SUBMITTED','2026-10-02 01:00:00'),"
				+ "(13,42,1,'{}','[\"VITALS\"]','DECLINED','2026-10-03 01:00:00')");
	}

	@Test
	void aRecordedApplicationLeavesTheUnansweredListAndKeepsItsFirstTime() {
		applications.recordPlanned(Set.of(11L), FIRST);
		applications.recordPlanned(Set.of(11L), FIRST.plusDays(1));

		assertThat(applications.findUnansweredByElderIds(Set.of(1L))).extracting(ServiceApplication::id)
				.containsExactly(12L);
		assertThat(plannedAt(11L)).isEqualTo(FIRST);
	}

	@Test
	void savingTheApplicationAgainDoesNotClearIt() {
		applications.recordPlanned(Set.of(11L), FIRST);

		applications.save(applications.findById(11L).orElseThrow());

		assertThat(plannedAt(11L)).isEqualTo(FIRST);
	}

	private LocalDateTime plannedAt(long id) {
		return jdbc.queryForObject("SELECT planned_at FROM care_service_application WHERE id = ?", LocalDateTime.class, id);
	}
}
