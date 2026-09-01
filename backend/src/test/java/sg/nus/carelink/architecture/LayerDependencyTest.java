package sg.nus.carelink.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * 把《目录结构与分层规则》里的约定变成构建时的硬约束。
 * 违反分层的代码在快速阶段就会让 PR 变红，不依赖人工评审发现。
 * 对应提案非功能需求：「领域层若引用表现层或持久化实现，构建失败」。
 */
@AnalyzeClasses(
		packages = "sg.nus.carelink",
		importOptions = ImportOption.DoNotIncludeTests.class)
class LayerDependencyTest {

	@ArchTest
	static final ArchRule 领域层不依赖表现层与持久化层 =
			noClasses().that().resideInAPackage("..domain..")
					.should().dependOnClassesThat()
					.resideInAnyPackage("..api..", "..infrastructure..")
					.because("依赖必须朝内，领域层要能脱离 Web 与数据库单独测试")
					.allowEmptyShould(true);

	@ArchTest
	static final ArchRule 表现层不直接依赖持久化层 =
			noClasses().that().resideInAPackage("..api..")
					.should().dependOnClassesThat()
					.resideInAPackage("..infrastructure..")
					.because("控制器只能经由 application 层进入，不得直连仓储实现")
					.allowEmptyShould(true);

	@ArchTest
	static final ArchRule 领域层不依赖持久化框架 =
			noClasses().that().resideInAPackage("..domain..")
					.should().dependOnClassesThat()
					.resideInAnyPackage("jakarta.persistence..", "org.springframework.data..")
					.because("JPA 注解属于 infrastructure，领域模型与 JPA 实体分开")
					.allowEmptyShould(true);

	@ArchTest
	static final ArchRule 模块之间不得形成循环依赖 =
			SlicesRuleDefinition.slices()
					.matching("sg.nus.carelink.(*)..")
					.should().beFreeOfCycles()
					.allowEmptyShould(true);   // 骨架阶段模块还是空的
}
