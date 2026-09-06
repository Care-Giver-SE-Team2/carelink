package sg.nus.carelink.visit.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.visit.domain.model.Visit;
import sg.nus.carelink.visit.infrastructure.persistence.entity.VisitJpaEntity;
import sg.nus.carelink.visit.infrastructure.persistence.repository.VisitJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class VisitRepositoryAdapterTest {

	private final VisitJpaRepository jpa = mock(VisitJpaRepository.class);
	private final VisitRepositoryAdapter adapter = new VisitRepositoryAdapter(jpa);

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		VisitJpaEntity entity = new VisitJpaEntity();
		entity.setId(7L);
		when(jpa.findById(7L)).thenReturn(Optional.of(entity));

		Optional<Visit> found = adapter.findById(7L);

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
		VisitJpaEntity entity = new VisitJpaEntity();
		entity.setId(7L);
		when(jpa.save(any(VisitJpaEntity.class))).thenReturn(entity);

		Visit saved = adapter.save(VisitMapper.toDomain(entity));

		assertThat(saved).isNotNull();
	}
}
