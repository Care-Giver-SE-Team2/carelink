package sg.nus.carelink.incident.infrastructure.persistence.adapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;

import sg.nus.carelink.incident.domain.model.Incident;
import sg.nus.carelink.incident.infrastructure.persistence.entity.IncidentJpaEntity;
import sg.nus.carelink.incident.infrastructure.persistence.repository.IncidentJpaRepository;

/** The adapter delegates to Spring Data and maps at the boundary; nothing else. */
class IncidentRepositoryAdapterTest {

	private final IncidentJpaRepository jpa = mock(IncidentJpaRepository.class);
	private final IncidentRepositoryAdapter adapter = new IncidentRepositoryAdapter(jpa);

	@Test
	void findByIdMapsTheEntityToTheDomainModel() {
		IncidentJpaEntity entity = new IncidentJpaEntity();
		entity.setId(7L);
		when(jpa.findById(7L)).thenReturn(Optional.of(entity));

		Optional<Incident> found = adapter.findById(7L);

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
		IncidentJpaEntity entity = new IncidentJpaEntity();
		entity.setId(7L);
		when(jpa.save(any(IncidentJpaEntity.class))).thenReturn(entity);

		Incident saved = adapter.save(IncidentMapper.toDomain(entity));

		assertThat(saved).isNotNull();
	}
}
