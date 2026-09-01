package sg.nus.carelink;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.mysql.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * 上下文加载 + Flyway 迁移的集成测试。
 * 起一个真实的 MySQL 容器，验证迁移脚本能落地、实体映射与表结构对得上。
 * 命名为 *IT，只在 `mvn verify -Pintegration`（慢速阶段）执行；
 * 本地跑它需要 Docker。
 */
@SpringBootTest
@Testcontainers
class ApplicationContextIT {

	@Container
	@ServiceConnection
	static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4");

	@Test
	void 上下文能加载且迁移脚本能执行() {
	}
}
