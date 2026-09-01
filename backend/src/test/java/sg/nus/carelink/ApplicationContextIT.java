package sg.nus.carelink;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Integration test covering context startup and the Flyway migrations. It starts a real
 * MySQL container so the migrations are genuinely applied and entity mappings are
 * validated against the resulting schema.
 *
 * <p>Named *IT, so it runs only under mvn verify -Pintegration, in the deep stage of the
 * pipeline. Running it locally requires Docker.
 */
@SpringBootTest
@Testcontainers
class ApplicationContextIT {

	@Container
	@ServiceConnection
	static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4");

	@Test
	void contextLoadsAndMigrationsApply() {
	}
}
