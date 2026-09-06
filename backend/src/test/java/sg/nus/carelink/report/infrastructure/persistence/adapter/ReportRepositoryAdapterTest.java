package sg.nus.carelink.report.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.report.domain.model.Report;
import sg.nus.carelink.report.infrastructure.persistence.entity.ReportJpaEntity;
import sg.nus.carelink.report.infrastructure.persistence.repository.ReportJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class ReportRepositoryAdapterTest {

	private final ReportJpaRepository jpa = mock(ReportJpaRepository.class);
	private final ReportRepositoryAdapter adapter = new ReportRepositoryAdapter(jpa);

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		ReportJpaEntity entity = new ReportJpaEntity();
		entity.setId(7L);
		when(jpa.findById(7L)).thenReturn(Optional.of(entity));

		Optional<Report> found = adapter.findById(7L);

		assertThat(found).isPresent();
		assertThat(found.get().id()).isEqualTo(7L);
	}

	@Test
	void findByIdIsEmptyWhenThereIsNoRow() {
		when(jpa.findById(any())).thenReturn(Optional.empty());

		assertThat(adapter.findById(7L)).isEmpty();
	}

	@Test
	void saveGoesThroughSpringDataAndComesBackAsDomain() {
		ReportJpaEntity entity = new ReportJpaEntity();
		entity.setId(7L);
		when(jpa.save(any(ReportJpaEntity.class))).thenReturn(entity);

		Report saved = adapter.save(ReportMapper.toDomain(entity));

		assertThat(saved).isNotNull();
	}
}
